import { NextResponse } from "next/server";
import { findUserByEmail, comparePassword, signJwtToken } from "@/lib/auth";

/**
 * POST /api/auth/extension-token
 * Called by the Chrome extension popup to obtain a JWT bearer token.
 * Unlike the web login, this returns the token in the response body (not a cookie)
 * so the extension can store it in chrome.storage.local.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const token = signJwtToken({ id: user.id, name: user.name, email: user.email });

    return NextResponse.json(
      { success: true, token, user: { id: user.id, name: user.name, email: user.email } },
      {
        status: 200,
        headers: {
          // Allow the extension's origin
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[auth/extension-token]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
