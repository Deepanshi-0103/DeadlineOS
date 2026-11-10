import { prisma } from "./prisma";
import {
  ICE_CREAM_COST,
  ICE_CREAMS_FOR_TREAT,
  POINTS_PER_TASK,
} from "./rewards-constants";

export {
  ICE_CREAM_COST,
  ICE_CREAMS_FOR_TREAT,
  POINTS_PER_TASK,
  REWARDS_CHANGED_EVENT,
} from "./rewards-constants";

const TREAT_GESTURES = [
  "🍦 You did the work — claim a real ice cream (or dessert) today. You earned it.",
  "☕ Treat unlocked: buy yourself a fancy coffee and enjoy it slowly.",
  "🎬 Reward time: an episode / movie night is officially sanctioned.",
  "🌿 Take a guilt-free walk or stretch break — your future self says thanks.",
  "🛍️ Small joy unlocked: pick one thing under ₹200 that makes you smile.",
  "📞 Call someone you like and celebrate finishing that goal together.",
];

export type RewardsDTO = {
  points: number;
  iceCreams: number;
  treatsClaimed: number;
  pointsPerTask: number;
  iceCreamCost: number;
  iceCreamsForTreat: number;
  canBuyIceCream: boolean;
  canClaimTreat: boolean;
  completedGoalsReady: { id: string; title: string }[];
  recent: { type: string; pointsDelta: number; at: string; note?: string }[];
  lastTreatGesture: string | null;
};

export async function getRewards(userId: string): Promise<RewardsDTO> {
  const [user, completedGoals, events] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        rewardPoints: true,
        iceCreams: true,
        treatsClaimed: true,
      },
    }),
    prisma.goal.findMany({
      where: {
        userId,
        OR: [{ status: "done" }, { progress: { gte: 100 } }],
      },
      select: { id: true, title: true },
      take: 10,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.rewardEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { type: true, pointsDelta: true, payload: true, createdAt: true },
    }),
  ]);

  if (!user) return emptyRewards();

  const lastTreat = events.find((e) => e.type === "claim_treat");
  let lastTreatGesture: string | null = null;
  if (lastTreat?.payload) {
    try {
      lastTreatGesture = (JSON.parse(lastTreat.payload) as { gesture?: string }).gesture || null;
    } catch {
      lastTreatGesture = null;
    }
  }

  const points = user.rewardPoints ?? 0;
  const iceCreams = user.iceCreams ?? 0;

  return {
    points,
    iceCreams,
    treatsClaimed: user.treatsClaimed ?? 0,
    pointsPerTask: POINTS_PER_TASK,
    iceCreamCost: ICE_CREAM_COST,
    iceCreamsForTreat: ICE_CREAMS_FOR_TREAT,
    canBuyIceCream: points >= ICE_CREAM_COST,
    canClaimTreat: iceCreams >= ICE_CREAMS_FOR_TREAT && completedGoals.length > 0,
    completedGoalsReady: completedGoals,
    recent: events.map((e) => {
      let note: string | undefined;
      if (e.payload) {
        try {
          const p = JSON.parse(e.payload) as { note?: string; gesture?: string; title?: string };
          note = p.note || p.gesture || p.title;
        } catch {
          /* ignore */
        }
      }
      return {
        type: e.type,
        pointsDelta: e.pointsDelta,
        at: e.createdAt.toISOString(),
        note,
      };
    }),
    lastTreatGesture,
  };
}

function emptyRewards(): RewardsDTO {
  return {
    points: 0,
    iceCreams: 0,
    treatsClaimed: 0,
    pointsPerTask: POINTS_PER_TASK,
    iceCreamCost: ICE_CREAM_COST,
    iceCreamsForTreat: ICE_CREAMS_FOR_TREAT,
    canBuyIceCream: false,
    canClaimTreat: false,
    completedGoalsReady: [],
    recent: [],
    lastTreatGesture: null,
  };
}

/** Call when a task flips to done (once). */
export async function awardTaskPoints(userId: string, taskId: string, title?: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { rewardPoints: { increment: POINTS_PER_TASK } },
  });
  await prisma.rewardEvent.create({
    data: {
      userId,
      type: "task_points",
      pointsDelta: POINTS_PER_TASK,
      payload: JSON.stringify({ taskId, title, note: `+${POINTS_PER_TASK} pts for completing a task` }),
    },
  });
  return POINTS_PER_TASK;
}

export async function buyIceCream(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false as const, error: "User not found" };
  if (user.rewardPoints < ICE_CREAM_COST) {
    return { ok: false as const, error: `Need ${ICE_CREAM_COST} points for an ice cream` };
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      rewardPoints: { decrement: ICE_CREAM_COST },
      iceCreams: { increment: 1 },
    },
  });
  await prisma.rewardEvent.create({
    data: {
      userId,
      type: "buy_icecream",
      pointsDelta: -ICE_CREAM_COST,
      payload: JSON.stringify({ note: "Bought 1 ice cream 🍦" }),
    },
  });
  return { ok: true as const, rewards: await getRewards(userId) };
}

export async function claimTreat(userId: string, goalId?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false as const, error: "User not found" };
  if (user.iceCreams < ICE_CREAMS_FOR_TREAT) {
    return {
      ok: false as const,
      error: `Collect ${ICE_CREAMS_FOR_TREAT} ice creams to unlock a treat`,
    };
  }

  const goal = goalId
    ? await prisma.goal.findFirst({
        where: {
          id: goalId,
          userId,
          OR: [{ status: "done" }, { progress: { gte: 100 } }],
        },
      })
    : await prisma.goal.findFirst({
        where: {
          userId,
          OR: [{ status: "done" }, { progress: { gte: 100 } }],
        },
        orderBy: { updatedAt: "desc" },
      });

  if (!goal) {
    return {
      ok: false as const,
      error: "Finish a goal (100% progress) before claiming a treat",
    };
  }

  const gesture = TREAT_GESTURES[Math.floor(Math.random() * TREAT_GESTURES.length)];

  await prisma.user.update({
    where: { id: userId },
    data: {
      iceCreams: { decrement: ICE_CREAMS_FOR_TREAT },
      treatsClaimed: { increment: 1 },
    },
  });
  await prisma.rewardEvent.create({
    data: {
      userId,
      type: "claim_treat",
      pointsDelta: 0,
      payload: JSON.stringify({
        goalId: goal.id,
        title: goal.title,
        gesture,
        note: `Treat for goal “${goal.title}”`,
      }),
    },
  });

  // Mark goal done if still active at 100%
  if (goal.status !== "done") {
    await prisma.goal.update({
      where: { id: goal.id },
      data: { status: "done", progress: 100 },
    });
  }

  return {
    ok: true as const,
    gesture,
    goalTitle: goal.title,
    rewards: await getRewards(userId),
  };
}
