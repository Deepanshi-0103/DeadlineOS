import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  // Bump after PasswordResetToken
  prismaDeadlineOSV12?: PrismaClient;
  prismaDeadlineOSPoolV12?: Pool;
};

/**
 * Hotspot DNS (172.20.10.1) fails for *.neon.tech.
 * Use NEON_HOST_IP + endpoint routing (same URL shape as working `prisma db push`).
 */
function createPool() {
  const hostOverride = process.env.NEON_HOST_IP?.trim();
  const endpoint =
    process.env.NEON_ENDPOINT?.trim() || "ep-cool-bird-bd1b0lgj";
  const servername =
    process.env.NEON_SERVERNAME?.trim() ||
    `${endpoint}-pooler.c-8.us-east-2.aws.neon.tech`;

  if (hostOverride) {
    const user = encodeURIComponent(process.env.NEON_USER || "neondb_owner");
    const password = encodeURIComponent(process.env.NEON_PASSWORD || "");
    const database = process.env.NEON_DATABASE || "neondb";
    const port = process.env.NEON_PORT || "5432";
    // Same as successful prisma db push — no sslmode in URL so Pool ssl opts apply
    const connectionString =
      `postgresql://${user}:${password}@${hostOverride}:${port}/${database}` +
      `?options=endpoint%3D${encodeURIComponent(endpoint)}`;

    return new Pool({
      connectionString,
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 30_000,
      max: 10,
      ssl: {
        rejectUnauthorized: false,
        servername,
        checkServerIdentity: () => undefined,
      },
    });
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is missing. Add your Neon connection string to frontend/.env"
    );
  }

  return new Pool({
    connectionString,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 30_000,
    max: 10,
    ssl: { rejectUnauthorized: false },
  });
}

function createPrismaClient() {
  const pool =
    globalForPrisma.prismaDeadlineOSPoolV12 ?? createPool();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaDeadlineOSPoolV12 = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prismaDeadlineOSV12 ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaDeadlineOSV12 = prisma;
}
