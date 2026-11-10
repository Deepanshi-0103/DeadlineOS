import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { purgeExampleRows } from "@/lib/seed-examples";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  // Strip leftover demo rows / plan copies without requiring re-login
  try {
    await purgeExampleRows(session.id);
  } catch (err) {
    console.warn("[auth/me] purge examples failed (non-fatal):", err);
  }

  return NextResponse.json({
    authenticated: true,
    user: session,
  });
}
