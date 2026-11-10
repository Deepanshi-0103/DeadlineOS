import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { deleteTask, updateTask } from "@/lib/tasks";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const result = await updateTask(session.id, params.id, body);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      task: result.task,
      pointsAwarded: result.pointsAwarded || 0,
    });
  } catch (err) {
    console.error("[api/tasks PATCH]", err);
    const message = err instanceof Error ? err.message : "Could not update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await deleteTask(session.id, params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
