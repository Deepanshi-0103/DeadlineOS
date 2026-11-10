import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { createGoal, listGoals } from "@/lib/goals";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const goals = await listGoals(session.id);
  return NextResponse.json({ goals });
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  const goal = await createGoal(session.id, body);
  return NextResponse.json({ goal }, { status: 201 });
}
