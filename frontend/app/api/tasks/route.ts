import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { createTask, listTasks } from "@/lib/tasks";

export async function GET(req: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const tasks = await listTasks(session.id, { status });
  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }
    const task = await createTask(session.id, body);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error("[api/tasks POST]", err);
    const message = err instanceof Error ? err.message : "Could not save task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
