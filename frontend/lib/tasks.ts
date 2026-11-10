import { prisma } from "./prisma";
import { awardTaskPoints } from "./rewards";
import { POINTS_PER_TASK } from "./rewards-constants";
import { deleteGoogleEventForTask, syncTaskToGoogle } from "./google-calendar";

export type TaskDTO = {
  id: string;
  title: string;
  notes: string | null;
  linkUrl: string | null;
  category: string;
  status: string;
  priority: string;
  dueAt: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  durationMin: number;
  goalId: string | null;
  goalTitle: string | null;
  opportunityId: string | null;
  completedAt: string | null;
  createdAt: string;
};

function normalizeUrl(raw?: string | null): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t.slice(0, 2000);
  if (/^[\w.-]+\.[a-z]{2,}/i.test(t)) return `https://${t}`.slice(0, 2000);
  return t.slice(0, 2000);
}

function mapTask(t: {
  id: string;
  title: string;
  notes: string | null;
  linkUrl?: string | null;
  category: string;
  status: string;
  priority: string;
  dueAt: Date | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  durationMin: number;
  goalId: string | null;
  opportunityId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  goal?: { title: string } | null;
}): TaskDTO {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    linkUrl: t.linkUrl ?? null,
    category: t.category,
    status: t.status,
    priority: t.priority,
    dueAt: t.dueAt?.toISOString() ?? null,
    scheduledStart: t.scheduledStart?.toISOString() ?? null,
    scheduledEnd: t.scheduledEnd?.toISOString() ?? null,
    durationMin: t.durationMin,
    goalId: t.goalId,
    goalTitle: t.goal?.title ?? null,
    opportunityId: t.opportunityId,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

export async function listTasks(
  userId: string,
  opts?: { status?: string; from?: Date; to?: Date }
) {
  const rows = await prisma.task.findMany({
    where: {
      userId,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.from || opts?.to
        ? {
            OR: [
              {
                dueAt: {
                  ...(opts.from ? { gte: opts.from } : {}),
                  ...(opts.to ? { lte: opts.to } : {}),
                },
              },
              {
                scheduledStart: {
                  ...(opts.from ? { gte: opts.from } : {}),
                  ...(opts.to ? { lte: opts.to } : {}),
                },
              },
            ],
          }
        : {}),
    },
    include: { goal: { select: { title: true } } },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(mapTask);
}

export async function createTask(
  userId: string,
  input: {
    title: string;
    notes?: string;
    linkUrl?: string | null;
    category?: string;
    priority?: string;
    dueAt?: string | null;
    durationMin?: number;
    goalId?: string | null;
    opportunityId?: string | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
  }
) {
  let goalId = input.goalId || null;
  if (goalId) {
    const g = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!g) goalId = null;
  }

  const t = await prisma.task.create({
    data: {
      userId,
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      linkUrl: normalizeUrl(input.linkUrl ?? null),
      category: input.category || "General",
      priority: input.priority || "medium",
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      durationMin: input.durationMin ?? 60,
      goalId,
      opportunityId: input.opportunityId || null,
      scheduledStart: input.scheduledStart ? new Date(input.scheduledStart) : null,
      scheduledEnd: input.scheduledEnd ? new Date(input.scheduledEnd) : null,
    },
    include: { goal: { select: { title: true } } },
  });
  // Fire-and-forget DeadlineOS → Google (if connected + has due/schedule)
  void syncTaskToGoogle(userId, t.id);
  return mapTask(t);
}

export async function updateTask(
  userId: string,
  id: string,
  input: Partial<{
    title: string;
    notes: string | null;
    linkUrl: string | null;
    category: string;
    status: string;
    priority: string;
    dueAt: string | null;
    durationMin: number;
    goalId: string | null;
    scheduledStart: string | null;
    scheduledEnd: string | null;
  }>
) {
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) return null;

  let goalId =
    input.goalId !== undefined ? input.goalId || null : existing.goalId;
  if (goalId) {
    const g = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!g) goalId = null;
  }

  const status = input.status ?? existing.status;
  const completedAt =
    status === "done"
      ? existing.completedAt || new Date()
      : status !== "done"
        ? null
        : existing.completedAt;

  const t = await prisma.task.update({
    where: { id },
    data: {
      title: input.title?.trim() ?? existing.title,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      linkUrl:
        input.linkUrl !== undefined
          ? normalizeUrl(input.linkUrl)
          : existing.linkUrl ?? null,
      category: input.category ?? existing.category,
      status,
      priority: input.priority ?? existing.priority,
      dueAt:
        input.dueAt !== undefined
          ? input.dueAt
            ? new Date(input.dueAt)
            : null
          : existing.dueAt,
      durationMin: input.durationMin ?? existing.durationMin,
      goalId,
      scheduledStart:
        input.scheduledStart !== undefined
          ? input.scheduledStart
            ? new Date(input.scheduledStart)
            : null
          : existing.scheduledStart,
      scheduledEnd:
        input.scheduledEnd !== undefined
          ? input.scheduledEnd
            ? new Date(input.scheduledEnd)
            : null
          : existing.scheduledEnd,
      completedAt,
    },
    include: { goal: { select: { title: true } } },
  });

  let pointsAwarded = 0;
  if (status === "done" && existing.status !== "done") {
    await prisma.behaviorEvent.create({
      data: {
        userId,
        type: "completed_early",
        payload: JSON.stringify({ taskId: id, at: new Date().toISOString() }),
      },
    });
    try {
      pointsAwarded = await awardTaskPoints(userId, id, t.title);
    } catch (err) {
      console.warn("[tasks] award points failed:", err);
      pointsAwarded = POINTS_PER_TASK; // UI still flashes; ledger may have failed
    }
    if (t.goalId) {
      const total = await prisma.task.count({ where: { goalId: t.goalId, userId } });
      const done = await prisma.task.count({
        where: { goalId: t.goalId, userId, status: "done" },
      });
      if (total > 0) {
        await prisma.goal.update({
          where: { id: t.goalId },
          data: { progress: Math.round((done / total) * 100) },
        });
      }
    }
  }

  void syncTaskToGoogle(userId, t.id);
  return { task: mapTask(t), pointsAwarded };
}

export async function deleteTask(userId: string, id: string) {
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await deleteGoogleEventForTask(userId, id);
  await prisma.task.delete({ where: { id } });
  return true;
}
