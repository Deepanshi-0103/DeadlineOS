import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/password-reset";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const result = await requestPasswordReset(email);

    return NextResponse.json({
      success: true,
      message:
        "If an account exists for that email, a password reset link has been sent.",
      emailConfigured: result.emailConfigured,
      // Present only when Resend isn't configured — so local recovery still works
      resetUrl: result.resetUrl,
    });
  } catch (err: unknown) {
    console.error("[auth/forgot-password]", err);
    const message =
      err instanceof Error ? err.message : "Could not start password recovery.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
