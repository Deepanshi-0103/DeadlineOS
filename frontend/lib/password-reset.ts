import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma";
import { hashPassword } from "./auth";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function appUrl() {
  return (
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function hashResetToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function isPasswordResetEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

async function sendResetEmail(to: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    console.info("[password-reset] Email not configured. Reset link:", resetUrl);
    return { sent: false as const };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your DeadlineOS password",
      html: `
        <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
          <h2 style="margin:0 0 12px">Password reset</h2>
          <p>We received a request to reset your DeadlineOS password.</p>
          <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#E3542F;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Choose a new password</a></p>
          <p style="font-size:13px;color:#666">This link expires in 1 hour. If you didn't ask for this, you can ignore this email.</p>
          <p style="font-size:12px;color:#999;word-break:break-all">${resetUrl}</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[password-reset] Resend failed:", text);
    throw new Error("Could not send reset email. Try again shortly.");
  }

  return { sent: true as const };
}

/** Create a reset token for the user (if they exist). Always safe to call. */
export async function requestPasswordReset(email: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  // Same outer response whether or not the user exists (anti-enumeration)
  if (!user) {
    return {
      ok: true as const,
      emailConfigured: isPasswordResetEmailConfigured(),
      resetUrl: null as string | null,
    };
  }

  // Invalidate unused prior tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const raw = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(raw);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = `${appUrl()}/reset-password?token=${raw}`;
  const emailResult = await sendResetEmail(user.email, resetUrl);

  return {
    ok: true as const,
    emailConfigured: emailResult.sent || isPasswordResetEmailConfigured(),
    // Only expose the link when email couldn't be sent (local/dev recovery)
    resetUrl: emailResult.sent ? null : resetUrl,
  };
}

export async function resetPasswordWithToken(rawToken: string, newPassword: string) {
  if (!rawToken?.trim()) {
    return { ok: false as const, error: "Reset link is missing or invalid." };
  }
  if (!newPassword || newPassword.length < 6) {
    return { ok: false as const, error: "Password must be at least 6 characters." };
  }

  const tokenHash = hashResetToken(rawToken.trim());
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return {
      ok: false as const,
      error: "This reset link is invalid or has expired. Request a new one.",
    };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Burn any other outstanding tokens for this user
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true as const };
}
