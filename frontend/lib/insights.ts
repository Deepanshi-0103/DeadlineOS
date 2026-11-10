import { prisma } from "./prisma";
import { listOpportunitiesForUser } from "./opportunities";
import { buildSmartAlerts } from "./alerts";

export async function getProductivityInsights(userId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [tasksDone, tasksOpen, goalsActive, events, ops, alerts] = await Promise.all([
    prisma.task.count({
      where: { userId, status: "done", completedAt: { gte: weekAgo } },
    }),
    prisma.task.count({ where: { userId, status: { in: ["todo", "doing"] } } }),
    prisma.goal.count({ where: { userId, status: "active" } }),
    prisma.behaviorEvent.groupBy({
      by: ["type"],
      where: { userId, createdAt: { gte: weekAgo } },
      _count: true,
    }),
    listOpportunitiesForUser(userId),
    buildSmartAlerts(userId),
  ]);

  const urgentOps = ops.filter((o) => o.daysLeft <= 3 && o.daysLeft < 9000).length;
  const byCategory: Record<string, number> = {};
  for (const o of ops) {
    byCategory[o.category] = (byCategory[o.category] || 0) + 1;
  }

  const eventMap = Object.fromEntries(events.map((e) => [e.type, e._count]));

  const completionRate =
    tasksDone + tasksOpen === 0
      ? 0
      : Math.round((tasksDone / (tasksDone + Math.min(tasksOpen, 20))) * 100);

  return {
    week: {
      tasksCompleted: tasksDone,
      tasksOpen,
      completionRate,
      goalsActive,
      urgentOpportunities: urgentOps,
      smartAlerts: alerts.length,
      dismissedSuggestions: eventMap.dismissed_suggestion || 0,
      reschedules: eventMap.rescheduled || 0,
    },
    discovery: {
      byCategory,
      topCategories: Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
    },
    focusTip:
      completionRate >= 70
        ? "Strong week — protect a deep-work block tomorrow for your top goal."
        : urgentOps > 0
          ? "Urgent deadlines ahead — use Plan My Day to schedule prep blocks."
          : "Add a goal-linked task to give your week a clear north star.",
  };
}

/** Discovery feed: opportunities filtered by type */
export async function getDiscoveryFeed(userId: string) {
  const ops = await listOpportunitiesForUser(userId);
  const buckets = {
    contests: ops.filter((o) =>
      /hackathon|contest|competition/i.test(`${o.category} ${o.title}`)
    ),
    internships: ops.filter((o) => /intern/i.test(`${o.category} ${o.title}`)),
    scholarships: ops.filter((o) => /scholar|grant|fellowship/i.test(`${o.category} ${o.title}`)),
    jobs: ops.filter((o) => /job|career/i.test(`${o.category} ${o.title}`)),
    other: [] as typeof ops,
  };
  const tagged = new Set([
    ...buckets.contests,
    ...buckets.internships,
    ...buckets.scholarships,
    ...buckets.jobs,
  ].map((o) => o.id));
  buckets.other = ops.filter((o) => !tagged.has(o.id));

  return {
    total: ops.length,
    buckets,
    suggested: ops
      .filter((o) => o.daysLeft <= 14 && o.daysLeft < 9000)
      .slice(0, 8),
  };
}
