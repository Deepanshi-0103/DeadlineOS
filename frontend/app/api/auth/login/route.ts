import { NextResponse } from "next/server";
import { findUserByEmail, comparePassword, signJwtToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { ensureExampleEntries } from "@/lib/seed-examples";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Retrieve user from database via Prisma / fallback
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "No user found with this email. Please check your credentials or sign up." },
        { status: 401 }
      );
    }

    // Verify password with bcrypt
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid password. Please try again." },
        { status: 401 }
      );
    }

    // Alert defaults + purge leftover [Example] demo rows
    try {
      await ensureExampleEntries(user.id);
    } catch (err) {
      console.warn("[auth/login] user defaults failed (non-fatal):", err);
    }

    // Generate JWT token
    const token = signJwtToken({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
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
    console.error("[auth/login]", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";

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
