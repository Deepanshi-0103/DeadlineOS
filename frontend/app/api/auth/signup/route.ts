import { NextResponse } from "next/server";
import { findUserByEmail, createUser, signJwtToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    // Create user in DB with bcrypt password hashing
    const newUser = await createUser({ name, email, password });

    // Generate JWT token
    const token = signJwtToken({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: newUser.id, name: newUser.name, email: newUser.email },
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: unknown) {
    console.error("[auth/signup]", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";

    // Surface clear message when Neon/Prisma is misconfigured
    if (
      message.includes("DATABASE_URL") ||
      message.includes("Can't reach database") ||
      message.includes("P1001") ||
      message.includes("P1017")
    ) {
      return NextResponse.json(
        { error: "Database connection failed. Check your Neon DATABASE_URL." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
