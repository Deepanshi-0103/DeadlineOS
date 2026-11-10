import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { buyIceCream, claimTreat, getRewards } from "@/lib/rewards";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rewards = await getRewards(session.id);
  return NextResponse.json({ rewards });
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "buy_icecream") {
    const result = await buyIceCream(session.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }

  if (action === "claim_treat") {
    const result = await claimTreat(session.id, body.goalId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
