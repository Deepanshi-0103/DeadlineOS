import { prisma } from "./prisma";

export type GoalDTO = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  color: string;
  targetDate: string | null;
  progress: number;
  status: string;
  taskCount: number;
  createdAt: string;
};

export async function listGoals(userId: string) {
  const rows = await prisma.goal.findMany({
    where: { userId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    category: g.category,
    color: g.color,
    targetDate: g.targetDate,
    progress: g.progress,
    status: g.status,
    taskCount: g._count.tasks,
    createdAt: g.createdAt.toISOString(),
  })) satisfies GoalDTO[];
}

export async function createGoal(
  userId: string,
  input: {
    title: string;
    description?: string;
    category?: string;
    color?: string;
    targetDate?: string | null;
  }
) {
  const g = await prisma.goal.create({
    data: {
      userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category || "General",
      color: input.color || "lilac",
      targetDate: input.targetDate || null,
    },
    include: { _count: { select: { tasks: true } } },
  });
  return {
    id: g.id,
    title: g.title,
    description: g.description,
    category: g.category,
    color: g.color,
    targetDate: g.targetDate,
    progress: g.progress,
    status: g.status,
    taskCount: g._count.tasks,
    createdAt: g.createdAt.toISOString(),
  } satisfies GoalDTO;
}

export async function updateGoal(
  userId: string,
  id: string,
  input: Partial<{
    title: string;
    description: string | null;
    category: string;
    color: string;
    targetDate: string | null;
    progress: number;
    status: string;
  }>
) {
  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const g = await prisma.goal.update({
    where: { id },
    data: {
      title: input.title?.trim() ?? existing.title,
      description:
        input.description !== undefined ? input.description : existing.description,
      category: input.category ?? existing.category,
      color: input.color ?? existing.color,
      targetDate:
        input.targetDate !== undefined ? input.targetDate : existing.targetDate,
      progress:
        input.progress !== undefined
          ? Math.max(0, Math.min(100, input.progress))
          : existing.progress,
      status: input.status ?? existing.status,
    },
    include: { _count: { select: { tasks: true } } },
  });
  return {
    id: g.id,
    title: g.title,
    description: g.description,
    category: g.category,
    color: g.color,
    targetDate: g.targetDate,
    progress: g.progress,
    status: g.status,
    taskCount: g._count.tasks,
    createdAt: g.createdAt.toISOString(),
  } satisfies GoalDTO;
}

export async function deleteGoal(userId: string, id: string) {
  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.goal.delete({ where: { id } });
  return true;
}
