import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { disconnectGoogleCalendar } from "@/lib/google-calendar";

export async function POST() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await disconnectGoogleCalendar(session.id);
  return NextResponse.json({ success: true });
}
