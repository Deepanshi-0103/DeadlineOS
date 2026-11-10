import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  exchangeGoogleCode,
  fetchGoogleUserEmail,
  isGoogleCalendarConfigured,
  saveGoogleConnection,
} from "@/lib/google-calendar";

function appUrl() {
  return (
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function jwtSecret() {
  const s = (process.env.JWT_SECRET || "").trim();
  if (!s || s.length < 32) throw new Error("JWT_SECRET missing");
  return s;
}

export async function GET(req: Request) {
  const base = appUrl();
  try {
    if (!isGoogleCalendarConfigured()) {
      return NextResponse.redirect(`${base}/settings?google=not_configured`);
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const err = searchParams.get("error");

    if (err) {
      return NextResponse.redirect(`${base}/settings?google=denied`);
    }
    if (!code || !state) {
      return NextResponse.redirect(`${base}/settings?google=error`);
    }

    let uid: string;
    try {
      const payload = jwt.verify(state, jwtSecret()) as {
        uid?: string;
        purpose?: string;
      };
      if (payload.purpose !== "google_calendar" || !payload.uid) {
        throw new Error("bad state");
      }
      uid = payload.uid;
    } catch {
      return NextResponse.redirect(`${base}/settings?google=invalid_state`);
    }

    const tokens = await exchangeGoogleCode(code);
    const email = await fetchGoogleUserEmail(tokens.access_token!);
    await saveGoogleConnection(uid, tokens, email);

    return NextResponse.redirect(`${base}/settings?google=connected`);
  } catch (e) {
    console.error("[google/callback]", e);
    return NextResponse.redirect(`${base}/settings?google=error`);
  }
}
