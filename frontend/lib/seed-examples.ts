import { prisma } from "./prisma";
import { ensureDefaultAlertRules } from "./alerts";

const DEFAULTS_FLAG = "user_defaults_v2";

/**
 * Alert rules only — never seed fake goals/tasks.
 * Purges leftover "[Example]" rows and polluted day-plan blocks
 * so Home/Plan never show demo copies.
 */
export async function ensureExampleEntries(userId: string): Promise<boolean> {
  await ensureDefaultAlertRules(userId);
  await purgeExampleRows(userId);

  const already = await prisma.behaviorEvent.findFirst({
    where: { userId, type: DEFAULTS_FLAG },
  });
  if (already) return false;

  await prisma.behaviorEvent.create({
    data: {
      userId,
      type: DEFAULTS_FLAG,
      payload: JSON.stringify({ at: new Date().toISOString(), seed: "alerts_only" }),
    },
  });

  return true;
}

/** Remove demo data + any plan blocks that still show Example titles */
export async function purgeExampleRows(userId: string) {
  const exampleFilter = {
    OR: [
      { title: { contains: "[Example]" } },
      { title: { startsWith: "Prep: [Example]" } },
    ],
  };

  await prisma.task.deleteMany({
    where: { userId, ...exampleFilter },
  });
  await prisma.goal.deleteMany({
    where: { userId, ...exampleFilter },
  });
  await prisma.opportunity.deleteMany({
    where: { userId, ...exampleFilter },
  });

  // Day plan blocks keep their own title copies even after tasks are deleted
  const plans = await prisma.dayPlan.findMany({
    where: { userId },
    select: { id: true },
  });
  if (plans.length === 0) return;

  const planIds = plans.map((p) => p.id);
  await prisma.planBlock.deleteMany({
    where: {
      dayPlanId: { in: planIds },
      OR: [
        { title: { contains: "[Example]" } },
        { title: { contains: "Example]" } },
      ],
    },
  });

  // Drop empty day plans so Home can regenerate from real tasks
  for (const p of plans) {
    const left = await prisma.planBlock.count({ where: { dayPlanId: p.id } });
    if (left === 0) {
      await prisma.dayPlan.delete({ where: { id: p.id } });
    }
  }
}
