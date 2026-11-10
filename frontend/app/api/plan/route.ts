import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  acceptDayPlan,
  clearDayPlan,
  completePlanBlock,
  deletePlanBlock,
  dismissSuggestion,
  dropPlanBlock,
  generateDayPlan,
  getCalendarMonth,
  getDayPlan,
  postponePlanBlock,
  rescheduleDayPlan,
  swapPlanBlocks,
} from "@/lib/planning";

export async function GET(req: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "day";

  if (mode === "calendar") {
    const year = Number(searchParams.get("year")) || new Date().getFullYear();
    const month = Number(searchParams.get("month")) || new Date().getMonth() + 1;
    const data = await getCalendarMonth(session.id, year, month);
    return NextResponse.json(data);
  }

  const date = searchParams.get("date") || undefined;
  const plan = await getDayPlan(session.id, date);
  return NextResponse.json({ plan });
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = body.action || "generate";
  const date = body.date || new Date().toISOString().slice(0, 10);

  if (action === "accept") {
    const plan = await acceptDayPlan(session.id, date);
    return NextResponse.json({ plan });
  }
  if (action === "dismiss") {
    const plan = await dismissSuggestion(session.id, date);
    return NextResponse.json({ plan });
  }
  if (action === "reschedule") {
    const plan = await rescheduleDayPlan(session.id, date);
    return NextResponse.json({ plan, source: plan?.source });
  }
  if (action === "remove_block" && body.blockId) {
    const plan = await deletePlanBlock(session.id, body.blockId);
    return NextResponse.json({ plan });
  }
  if (action === "drop" && body.blockId) {
    const plan = await dropPlanBlock(session.id, body.blockId);
    return NextResponse.json({ plan });
  }
  if (action === "postpone" && body.blockId) {
    const plan = await postponePlanBlock(session.id, body.blockId);
    return NextResponse.json({ plan });
  }
  if (action === "swap" && body.blockId && body.otherBlockId) {
    const plan = await swapPlanBlocks(session.id, body.blockId, body.otherBlockId);
    return NextResponse.json({ plan });
  }
  if (action === "complete" && body.blockId) {
    const plan = await completePlanBlock(session.id, body.blockId);
    return NextResponse.json({ plan });
  }
  if (action === "clear") {
    await clearDayPlan(session.id, date);
    return NextResponse.json({ plan: null });
  }

  const plan = await generateDayPlan(session.id, date);
  return NextResponse.json({ plan, source: plan.source }, { status: 201 });
}
