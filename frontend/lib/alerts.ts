import { prisma } from "./prisma";

export type AlertRuleDTO = {
  id: string;
  type: string;
  label: string;
  enabled: boolean;
  daysBefore: number;
  categoryFilter: string | null;
};

export type SmartAlert = {
  id: string;
  kind: string;
  title: string;
  when: string;
  urgency: "high" | "medium" | "low";
  href?: string;
};

const DEFAULT_RULES = [
  { type: "deadline", label: "Opportunity deadlines", daysBefore: 2 },
  { type: "contest", label: "Contest alerts", daysBefore: 3 },
  { type: "mock", label: "Mock test alerts", daysBefore: 1 },
  { type: "custom", label: "Custom reminders", daysBefore: 1 },
];

export async function ensureDefaultAlertRules(userId: string) {
  const count = await prisma.alertRule.count({ where: { userId } });
  if (count > 0) return;
  await prisma.alertRule.createMany({
    data: DEFAULT_RULES.map((r) => ({
      userId,
      type: r.type,
      label: r.label,
      daysBefore: r.daysBefore,
      enabled: true,
    })),
  });
}

export async function listAlertRules(userId: string) {
  await ensureDefaultAlertRules(userId);
  const rows = await prisma.alertRule.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    label: r.label,
    enabled: r.enabled,
    daysBefore: r.daysBefore,
    categoryFilter: r.categoryFilter,
  })) satisfies AlertRuleDTO[];
}

export async function updateAlertRule(
  userId: string,
  id: string,
  input: Partial<{ enabled: boolean; daysBefore: number; label: string; categoryFilter: string | null }>
) {
  const existing = await prisma.alertRule.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const r = await prisma.alertRule.update({
    where: { id },
    data: {
      enabled: input.enabled ?? existing.enabled,
      daysBefore: input.daysBefore ?? existing.daysBefore,
      label: input.label?.trim() ?? existing.label,
      categoryFilter:
        input.categoryFilter !== undefined
          ? input.categoryFilter
          : existing.categoryFilter,
    },
  });
  return {
    id: r.id,
    type: r.type,
    label: r.label,
    enabled: r.enabled,
    daysBefore: r.daysBefore,
    categoryFilter: r.categoryFilter,
  } satisfies AlertRuleDTO;
}

/** Build smart notifications from rules + opportunities + tasks */
export async function buildSmartAlerts(userId: string): Promise<SmartAlert[]> {
  const rules = await listAlertRules(userId);
  const enabled = rules.filter((r) => r.enabled);
  const alerts: SmartAlert[] = [];
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const ops = await prisma.opportunity.findMany({
    where: { userId },
    orderBy: { deadline: "asc" },
    take: 40,
  });

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { not: "done" },
      dueAt: { not: null },
    },
    orderBy: { dueAt: "asc" },
    take: 40,
  });

  for (const rule of enabled) {
    if (rule.type === "deadline" || rule.type === "contest" || rule.type === "custom") {
      for (const op of ops) {
        if (!op.deadline) continue;
        const days = op.daysLeft;
        if (days > rule.daysBefore || days >= 9000) continue;
        const isContest =
          /hackathon|contest|competition/i.test(op.category) ||
          /hackathon|contest/i.test(op.title);
        if (rule.type === "contest" && !isContest) continue;
        if (rule.categoryFilter && op.category !== rule.categoryFilter) continue;

        alerts.push({
          id: `op-${op.id}-${rule.id}`,
          kind: rule.type,
          title: op.title,
          when:
            days <= 0
              ? "Due today"
              : days === 1
                ? "Tomorrow"
                : `In ${days} days · ${op.deadline}`,
          urgency: days <= 1 ? "high" : days <= 3 ? "medium" : "low",
          href: "/dashboard?view=urgent",
        });
      }
    }

    if (rule.type === "mock" || rule.type === "custom" || rule.type === "deadline") {
      for (const t of tasks) {
        if (!t.dueAt) continue;
        const due = t.dueAt.toISOString().slice(0, 10);
        const diff = Math.ceil(
          (Date.parse(due) - Date.parse(today)) / (1000 * 60 * 60 * 24)
        );
        if (diff > rule.daysBefore || diff < 0) continue;
        const isMock = /mock|test|exam/i.test(t.category) || /mock|test|exam/i.test(t.title);
        if (rule.type === "mock" && !isMock) continue;

        alerts.push({
          id: `task-${t.id}-${rule.id}`,
          kind: rule.type === "mock" ? "mock" : "deadline",
          title: t.title,
          when: diff <= 0 ? "Due today" : diff === 1 ? "Tomorrow" : `In ${diff} days`,
          urgency: diff <= 1 ? "high" : "medium",
          href: "/tasks",
        });
      }
    }
  }

  // Deduplicate by title+when, prioritize high
  const seen = new Set<string>();
  return alerts
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.urgency] - rank[b.urgency];
    })
    .filter((a) => {
      const key = `${a.title}|${a.when}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}
