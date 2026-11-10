import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAuthSession } from "@/lib/auth";
import {
  buildGoogleAuthUrl,
  isGoogleCalendarConfigured,
} from "@/lib/google-calendar";

function jwtSecret() {
  const s = (process.env.JWT_SECRET || "").trim();
  if (!s || s.length < 32) throw new Error("JWT_SECRET missing");
  return s;
}

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", process.env.APP_URL || "http://localhost:3000"));
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google Calendar is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env",
      },
      { status: 503 }
    );
  }

  const state = jwt.sign(
    { uid: session.id, purpose: "google_calendar" },
    jwtSecret(),
    { expiresIn: "15m" }
  );

  return NextResponse.redirect(buildGoogleAuthUrl(state));
}
