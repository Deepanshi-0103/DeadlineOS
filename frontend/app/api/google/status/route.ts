import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getGoogleConnectionStatus } from "@/lib/google-calendar";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = await getGoogleConnectionStatus(session.id);
  return NextResponse.json(status);
}
