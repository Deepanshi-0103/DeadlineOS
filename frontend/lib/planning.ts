import { prisma } from "./prisma";
import {
  isLlmPlanEnabled,
  proposeDayPlanWithGemini,
  type ProposedBlock,
} from "./llm-plan";

export type PlanBlockDTO = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  status: string;
  taskId: string | null;
};

export type DayPlanDTO = {
  id: string;
  date: string;
  suggestion: string | null;
  accepted: boolean;
  blocks: PlanBlockDTO[];
  source?: "gemini" | "rules";
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(mins: number): string {
  const n = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;
}

function addMinutes(hhmm: string, mins: number): string {
  return fromMinutes(toMinutes(hhmm) + mins);
}

function blockDurationMin(start: string, end: string): number {
  return Math.max(15, toMinutes(end) - toMinutes(start));
}

/** Learn from behavior: prefer morning if user completes early often */
async function adaptivePrefs(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const events = await prisma.behaviorEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  let preferMorning = user?.preferMorning ?? true;
  let start = user?.focusHoursStart ?? 9;
  const end = user?.focusHoursEnd ?? 17;

  const early = events.filter((e) => e.type === "completed_early").length;
  const late = events.filter((e) => e.type === "completed_late").length;
  const dismissed = events.filter((e) => e.type === "dismissed_suggestion").length;
  const skipped = events.filter((e) => e.type === "skipped_block").length;

  if (late > early + 2) {
    preferMorning = false;
    start = Math.min(11, start + 1);
  } else if (early > late) {
    preferMorning = true;
    start = Math.max(8, start - (early > 5 ? 1 : 0));
  }

  // If user often skips afternoon blocks, bias shorter afternoon slots
  const shortAfternoon = skipped > 3;

  return { preferMorning, start, end, shortAfternoon, dismissed };
}

type DraftBlock = {
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  taskId: string | null;
};

async function persistDayPlan(
  userId: string,
  day: string,
  blocks: DraftBlock[],
  suggestion: string | null,
  source: "gemini" | "rules"
): Promise<DayPlanDTO> {
  const existing = await prisma.dayPlan.findUnique({
    where: { userId_date: { userId, date: day } },
    include: { blocks: true },
  });

  if (existing) {
    await prisma.planBlock.deleteMany({ where: { dayPlanId: existing.id } });
    const updated = await prisma.dayPlan.update({
      where: { id: existing.id },
      data: {
        suggestion,
        accepted: false,
        blocks: {
          create: blocks.map((b) => ({
            title: b.title,
            startTime: b.startTime,
            endTime: b.endTime,
            category: b.category,
            taskId: b.taskId,
            status: "planned",
          })),
        },
      },
      include: { blocks: { orderBy: { startTime: "asc" } } },
    });
    return { ...mapPlan(updated), source };
  }

  const created = await prisma.dayPlan.create({
    data: {
      userId,
      date: day,
      suggestion,
      accepted: false,
      blocks: {
        create: blocks.map((b) => ({
          title: b.title,
          startTime: b.startTime,
          endTime: b.endTime,
          category: b.category,
          taskId: b.taskId,
          status: "planned",
        })),
      },
    },
    include: { blocks: { orderBy: { startTime: "asc" } } },
  });
  return { ...mapPlan(created), source };
}

async function loadPlanInputs(userId: string) {
  const prefs = await adaptivePrefs(userId);

  const openTasks = await prisma.task.findMany({
    where: {
      userId,
      status: { in: ["todo", "doing"] },
      NOT: { title: { contains: "[Example]" } },
    },
    include: { goal: true },
    orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
    take: 24,
  });

  const seenTitles = new Set<string>();
  const ranked = [...openTasks]
    .sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 } as Record<string, number>;
      return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
    })
    .filter((t) => {
      const key = t.title.trim().toLowerCase();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

  const urgentOps = await prisma.opportunity.findMany({
    where: {
      userId,
      daysLeft: { lte: 5 },
      NOT: { title: { contains: "[Example]" } },
    },
    orderBy: { daysLeft: "asc" },
    take: 3,
  });

  return { prefs, ranked, urgentOps };
}

/** Rules-based scheduler (fallback / offline). */
export async function generateDayPlanRules(
  userId: string,
  date?: string
): Promise<DayPlanDTO> {
  const day = date || new Date().toISOString().slice(0, 10);
  const { prefs, ranked, urgentOps } = await loadPlanInputs(userId);

  let cursor = prefs.preferMorning
    ? `${pad(prefs.start)}:00`
    : `${pad(Math.min(prefs.start + 2, 12))}:00`;

  const blocks: DraftBlock[] = [];

  for (const t of ranked.slice(0, 6)) {
    let dur = t.durationMin || 60;
    if (prefs.shortAfternoon && Number(cursor.slice(0, 2)) >= 14) {
      dur = Math.min(dur, 45);
    }
    const endHour = Number(addMinutes(cursor, dur).slice(0, 2));
    if (endHour >= prefs.end && blocks.length >= 2) break;

    const end = addMinutes(cursor, dur);
    blocks.push({
      title: t.title,
      startTime: cursor,
      endTime: end,
      category: t.category || t.goal?.category || "General",
      taskId: t.id,
    });
    cursor = addMinutes(end, 15);
  }

  for (const op of urgentOps) {
    if (blocks.length >= 7) break;
    if (Number(cursor.slice(0, 2)) >= prefs.end) break;
    const end = addMinutes(cursor, 45);
    blocks.push({
      title: `Prep: ${op.title}`,
      startTime: cursor,
      endTime: end,
      category: op.category || "Career",
      taskId: null,
    });
    cursor = addMinutes(end, 10);
  }

  const freeHours = Math.max(0, prefs.end - Number(cursor.slice(0, 2)));
  let suggestion: string | null = null;
  if (freeHours >= 2 && prefs.dismissed < 5) {
    suggestion = `You have ~${freeHours} free hours after ${cursor}. Schedule focused revision or an internship application to stay on track?`;
  } else if (ranked.length === 0) {
    suggestion =
      "Your day is light — capture a new opportunity or add a goal-linked task to build momentum.";
  } else {
    suggestion = `Planned ${blocks.length} blocks based on your goals and deadlines${
      prefs.preferMorning ? " (morning focus)" : " (later focus)"
    }.`;
  }

  return persistDayPlan(userId, day, blocks, suggestion, "rules");
}

/**
 * Prefer Gemini tool-calling plan; fall back to rules if disabled / empty / error.
 */
export async function generateDayPlan(userId: string, date?: string): Promise<DayPlanDTO> {
  const day = date || new Date().toISOString().slice(0, 10);

  if (isLlmPlanEnabled()) {
    try {
      const { prefs, ranked, urgentOps } = await loadPlanInputs(userId);
      const { proposal, error } = await proposeDayPlanWithGemini({
        date: day,
        focusStart: prefs.start,
        focusEnd: prefs.end,
        preferMorning: prefs.preferMorning,
        tasks: ranked.map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category || t.goal?.category || "General",
          priority: t.priority,
          durationMin: t.durationMin || 60,
          dueAt: t.dueAt?.toISOString() ?? null,
          goalTitle: t.goal?.title ?? null,
        })),
        opportunities: urgentOps.map((o) => ({
          id: o.id,
          title: o.title,
          category: o.category || "Career",
          daysLeft: o.daysLeft,
          deadline: o.deadline,
        })),
      });

      if (proposal?.blocks?.length) {
        const blocks: DraftBlock[] = proposal.blocks.map((b: ProposedBlock) => ({
          title: b.title,
          startTime: b.startTime,
          endTime: b.endTime,
          category: b.category,
          taskId: b.taskId,
        }));
        return persistDayPlan(userId, day, blocks, proposal.suggestion, "gemini");
      }
      if (error) console.warn("[planning] Gemini plan skipped:", error);
    } catch (err) {
      console.warn("[planning] Gemini plan failed, using rules:", err);
    }
  }

  return generateDayPlanRules(userId, day);
}

/** Drop a block (not done) and pull later blocks earlier to fill the gap. */
export async function dropPlanBlock(userId: string, blockId: string) {
  const block = await prisma.planBlock.findFirst({
    where: { id: blockId, dayPlan: { userId } },
    include: { dayPlan: true },
  });
  if (!block) return null;

  const gap = blockDurationMin(block.startTime, block.endTime) + 10;
  const later = await prisma.planBlock.findMany({
    where: {
      dayPlanId: block.dayPlanId,
      startTime: { gte: block.startTime },
      id: { not: block.id },
      status: { not: "skipped" },
    },
  });

  await prisma.planBlock.update({
    where: { id: block.id },
    data: { status: "skipped" },
  });

  for (const b of later) {
    await prisma.planBlock.update({
      where: { id: b.id },
      data: {
        startTime: addMinutes(b.startTime, -gap),
        endTime: addMinutes(b.endTime, -gap),
      },
    });
  }

  await prisma.behaviorEvent.create({
    data: {
      userId,
      type: "skipped_block",
      payload: JSON.stringify({ blockId, title: block.title, gap }),
    },
  });

  return getDayPlan(userId, block.dayPlan.date);
}

/** Swap two blocks' work (times stay; titles/tasks exchange). */
export async function swapPlanBlocks(
  userId: string,
  blockId: string,
  otherBlockId: string
) {
  if (blockId === otherBlockId) return getDayPlan(userId);

  const a = await prisma.planBlock.findFirst({
    where: { id: blockId, dayPlan: { userId } },
    include: { dayPlan: true },
  });
  const b = await prisma.planBlock.findFirst({
    where: { id: otherBlockId, dayPlan: { userId } },
  });
  if (!a || !b || a.dayPlanId !== b.dayPlanId) return null;

  await prisma.$transaction([
    prisma.planBlock.update({
      where: { id: a.id },
      data: {
        title: b.title,
        category: b.category,
        taskId: b.taskId,
        status: b.status === "skipped" ? "planned" : b.status,
      },
    }),
    prisma.planBlock.update({
      where: { id: b.id },
      data: {
        title: a.title,
        category: a.category,
        taskId: a.taskId,
        status: a.status === "skipped" ? "planned" : a.status,
      },
    }),
  ]);

  await prisma.behaviorEvent.create({
    data: {
      userId,
      type: "swapped_block",
      payload: JSON.stringify({ blockId, otherBlockId }),
    },
  });

  return getDayPlan(userId, a.dayPlan.date);
}

/**
 * Postpone: push this block + all later blocks by this block's duration.
 * Frees the original slot so the day shifts after a miss.
 */
export async function postponePlanBlock(userId: string, blockId: string) {
  const block = await prisma.planBlock.findFirst({
    where: { id: blockId, dayPlan: { userId } },
    include: { dayPlan: true },
  });
  if (!block) return null;

  const shift = blockDurationMin(block.startTime, block.endTime);
  const affected = await prisma.planBlock.findMany({
    where: {
      dayPlanId: block.dayPlanId,
      startTime: { gte: block.startTime },
      status: { not: "skipped" },
    },
  });

  for (const b of affected) {
    await prisma.planBlock.update({
      where: { id: b.id },
      data: {
        startTime: addMinutes(b.startTime, shift),
        endTime: addMinutes(b.endTime, shift),
        status: b.id === block.id ? "moved" : b.status,
      },
    });
  }

  await prisma.behaviorEvent.create({
    data: {
      userId,
      type: "postponed_block",
      payload: JSON.stringify({ blockId, shiftMin: shift }),
    },
  });

  const plan = await getDayPlan(userId, block.dayPlan.date);
  if (plan) {
    return {
      ...plan,
      suggestion: `Postponed “${block.title}” by ${shift}m — later blocks shifted.`,
    };
  }
  return plan;
}

export async function completePlanBlock(userId: string, blockId: string) {
  const block = await prisma.planBlock.findFirst({
    where: { id: blockId, dayPlan: { userId } },
    include: { dayPlan: true },
  });
  if (!block) return null;

  await prisma.planBlock.update({
    where: { id: block.id },
    data: { status: "done" },
  });

  if (block.taskId) {
    // Goes through updateTask so reward points are awarded once
    const { updateTask } = await import("./tasks");
    await updateTask(userId, block.taskId, { status: "done" });
    // points flash is handled client-side via REWARDS_CHANGED_EVENT
  } else {
    await prisma.behaviorEvent.create({
      data: {
        userId,
        type: "completed_early",
        payload: JSON.stringify({ blockId, taskId: null }),
      },
    });
  }

  return getDayPlan(userId, block.dayPlan.date);
}

function mapPlan(p: {
  id: string;
  date: string;
  suggestion: string | null;
  accepted: boolean;
  blocks: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    category: string;
    status: string;
    taskId: string | null;
  }[];
}): DayPlanDTO {
  return {
    id: p.id,
    date: p.date,
    suggestion: p.suggestion,
    accepted: p.accepted,
    blocks: p.blocks.map((b) => ({
      id: b.id,
      title: b.title,
      startTime: b.startTime,
      endTime: b.endTime,
      category: b.category,
      status: b.status,
      taskId: b.taskId,
    })),
  };
}

export async function getDayPlan(userId: string, date?: string) {
  const day = date || new Date().toISOString().slice(0, 10);
  const p = await prisma.dayPlan.findUnique({
    where: { userId_date: { userId, date: day } },
    include: { blocks: { orderBy: { startTime: "asc" } } },
  });
  if (!p) return null;
  const cleaned = {
    ...p,
    blocks: p.blocks.filter(
      (b) => !b.title.includes("[Example]") && b.status !== "skipped"
    ),
  };
  return mapPlan(cleaned);
}

export async function deletePlanBlock(userId: string, blockId: string) {
  const block = await prisma.planBlock.findFirst({
    where: { id: blockId, dayPlan: { userId } },
    include: { dayPlan: true },
  });
  if (!block) return null;
  await prisma.planBlock.delete({ where: { id: blockId } });
  return getDayPlan(userId, block.dayPlan.date);
}

export async function clearDayPlan(userId: string, date: string) {
  const p = await prisma.dayPlan.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (!p) return null;
  await prisma.dayPlan.delete({ where: { id: p.id } });
  return null;
}

export async function acceptDayPlan(userId: string, date: string) {
  const p = await prisma.dayPlan.findUnique({
    where: { userId_date: { userId, date } },
    include: { blocks: true },
  });
  if (!p) return null;

  const syncedTaskIds: string[] = [];
  // Sync block times onto tasks
  for (const b of p.blocks) {
    if (!b.taskId) continue;
    const [ys, ms, ds] = date.split("-").map(Number);
    const [sh, sm] = b.startTime.split(":").map(Number);
    const [eh, em] = b.endTime.split(":").map(Number);
    await prisma.task.update({
      where: { id: b.taskId },
      data: {
        scheduledStart: new Date(Date.UTC(ys, ms - 1, ds, sh, sm)),
        scheduledEnd: new Date(Date.UTC(ys, ms - 1, ds, eh, em)),
        status: "doing",
      },
    });
    syncedTaskIds.push(b.taskId);
  }

  const updated = await prisma.dayPlan.update({
    where: { id: p.id },
    data: { accepted: true },
    include: { blocks: { orderBy: { startTime: "asc" } } },
  });

  // DeadlineOS → Google Calendar (one-way) for accepted plan blocks
  try {
    const { syncAcceptedPlanToGoogle } = await import("./google-calendar");
    void syncAcceptedPlanToGoogle(userId, syncedTaskIds);
  } catch (err) {
    console.warn("[planning] google sync skipped:", err);
  }

  return mapPlan(updated);
}

export async function dismissSuggestion(userId: string, date: string) {
  await prisma.behaviorEvent.create({
    data: {
      userId,
      type: "dismissed_suggestion",
      payload: JSON.stringify({ date }),
    },
  });
  const p = await prisma.dayPlan.findUnique({
    where: { userId_date: { userId, date } },
    include: { blocks: { orderBy: { startTime: "asc" } } },
  });
  if (!p) return null;
  return prisma.dayPlan
    .update({
      where: { id: p.id },
      data: { suggestion: null },
      include: { blocks: { orderBy: { startTime: "asc" } } },
    })
    .then(mapPlan);
}

export async function rescheduleDayPlan(userId: string, date: string) {
  await prisma.behaviorEvent.create({
    data: {
      userId,
      type: "rescheduled",
      payload: JSON.stringify({ date, at: new Date().toISOString() }),
    },
  });
  return generateDayPlan(userId, date);
}

export async function getCalendarMonth(userId: string, year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      OR: [
        { dueAt: { gte: start, lte: end } },
        { scheduledStart: { gte: start, lte: end } },
      ],
    },
  });

  const ops = await prisma.opportunity.findMany({
    where: { userId },
  });

  const byDay: Record<
    string,
    { tasks: { id: string; title: string; category: string }[]; deadlines: { id: string; title: string }[] }
  > = {};

  const ensure = (d: string) => {
    if (!byDay[d]) byDay[d] = { tasks: [], deadlines: [] };
  };

  for (const t of tasks) {
    const d = (t.scheduledStart || t.dueAt)?.toISOString().slice(0, 10);
    if (!d || !d.startsWith(`${year}-${pad(month)}`)) continue;
    ensure(d);
    byDay[d].tasks.push({ id: t.id, title: t.title, category: t.category });
  }

  for (const op of ops) {
    if (!op.deadline?.startsWith(`${year}-${pad(month)}`)) continue;
    ensure(op.deadline);
    byDay[op.deadline].deadlines.push({ id: op.id, title: op.title });
  }

  return { year, month, days: byDay };
}
