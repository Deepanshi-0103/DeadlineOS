import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import { ensureExampleEntries } from "./seed-examples";

/**
 * JWT signing secret — must come from env. Never hardcode a fallback:
 * a public/repo-visible default lets anyone forge login tokens.
 */
function requireJwtSecret(): string {
  const secret = (process.env.JWT_SECRET || "").trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET is missing or too short. Set a random 32+ character value in frontend/.env (never commit it)."
    );
  }
  return secret;
}

export const AUTH_COOKIE_NAME = "dbd_auth_token";

export interface UserSessionPayload {
  id: string;
  name: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signJwtToken(payload: UserSessionPayload): string {
  return jwt.sign(payload, requireJwtSecret(), { expiresIn: "7d" });
}

export function verifyJwtToken(token: string): UserSessionPayload | null {
  try {
    return jwt.verify(token, requireJwtSecret()) as UserSessionPayload;
  } catch {
    return null;
  }
}

export async function getAuthSession(): Promise<UserSessionPayload | null> {
  try {
    // 1. Check Authorization: Bearer header first (used by Chrome extension)
    const headerStore = headers();
    const authHeader = headerStore.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const bearerToken = authHeader.slice(7).trim();
      if (bearerToken) return verifyJwtToken(bearerToken);
    }

    // 2. Fall back to HTTP-only cookie (used by web app)
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyJwtToken(token);
  } catch {
    return null;
  }
}

export async function findUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
}

export async function createUser({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  const dbUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
    },
  });

  // Alert defaults + purge any leftover demo rows
  try {
    await ensureExampleEntries(dbUser.id);
  } catch (err) {
    console.warn("[auth] user defaults failed (non-fatal):", err);
  }

  return { id: dbUser.id, name: dbUser.name, email: dbUser.email };
}
