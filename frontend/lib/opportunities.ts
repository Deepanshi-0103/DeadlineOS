import { prisma } from "./prisma";
import type { Opportunity, StatsData } from "./types";

export type OpportunityRecord = {
  id: string;
  title: string;
  organizer: string;
  category: string;
  reward: string;
  deadline: string | null;
  daysLeft: number;
  priority: string;
  status: string;
  sourceUrl: string | null;
  summary?: string | null;
  eligibility?: string | null;
  registrationUrl?: string | null;
  confidence?: number | null;
  needsReview?: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Calendar days from today (UTC date) until deadline YYYY-MM-DD. Never negative. */
export function computeDaysLeft(deadline: string | null | undefined): number {
  if (!deadline || deadline.length < 8) return 9999; // unknown — sorts last, UI shows "—"
  const today = new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const parts = deadline.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 9999;
  const [y, m, d] = parts;
  const end = Date.UTC(y, m - 1, d);
  const raw = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, raw);
}

/** Normalize URL for duplicate detection (strip hash, trailing slash, lowercase). */
export function normalizeOpportunityUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.trim());
    u.hash = "";
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, "");
  }
}

export function computePriority(daysLeft: number): "HIGH" | "MEDIUM" | "LOW" {
  if (daysLeft >= 9000) return "LOW";
  if (daysLeft <= 3) return "HIGH";
  if (daysLeft <= 10) return "MEDIUM";
  return "LOW";
}

/** Auto-mark Urgent when close; otherwise keep Saved unless caller overrides. */
export function defaultStatus(daysLeft: number, preferred?: string): string {
  if (preferred) return preferred;
  if (daysLeft >= 9000) return "Needs Review";
  if (daysLeft <= 3) return "Urgent";
  return "Saved";
}

export function toClientOpportunity(row: OpportunityRecord): Opportunity {
  const daysLeft = computeDaysLeft(row.deadline);
  const displayDays = daysLeft >= 9000 ? 9999 : daysLeft;
  return {
    id: row.id,
    title: row.title,
    organizer: row.organizer,
    category: row.category,
    reward: row.reward,
    deadline: row.deadline ? row.deadline.slice(0, 10) : "",
    daysLeft: displayDays,
    priority: computePriority(displayDays),
    status: row.status,
    sourceUrl: row.sourceUrl ?? undefined,
    link: row.registrationUrl || row.sourceUrl || undefined,
    summary: row.summary ?? undefined,
    eligibility: row.eligibility ?? undefined,
    registrationUrl: row.registrationUrl ?? undefined,
    confidence: row.confidence ?? undefined,
    needsReview: row.needsReview ?? false,
  };
}

export function computeStats(rows: Opportunity[]): StatsData {
  return {
    total: rows.length,
    urgent: rows.filter((o) => o.status === "Urgent" || o.daysLeft <= 3).length,
    submitted: rows.filter((o) => o.status === "Submitted").length,
    saved: rows.filter((o) => o.status === "Saved" || o.status === "Needs Review").length,
  };
}

export async function listOpportunitiesForUser(userId: string) {
  const rows = await prisma.opportunity.findMany({
    where: { userId },
    orderBy: { deadline: "asc" },
  });

  // Derive daysLeft/priority in memory — avoid writing on every list read
  return rows.map((row: OpportunityRecord) => toClientOpportunity(row));
}

export function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+/g, "/").replace(/\/$/, "");
    const last = path.split("/").filter(Boolean).pop();
    if (last) {
      return decodeURIComponent(last)
        .replace(/[-_]+/g, " ")
        .replace(/\.\w+$/, "")
        .replace(/\s+\d{5,}$/, "") // Unstop-style numeric id suffix
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .slice(0, 120);
    }
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "Untitled opportunity";
  }
}

export function organizerFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Unknown";
  }
}

export function deadlineDaysFromNow(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export async function createOpportunityForUser(
  userId: string,
  input: {
    title: string;
    organizer?: string;
    category?: string;
    reward?: string;
    deadline?: string | null;
    status?: string;
    sourceUrl?: string | null;
    summary?: string | null;
    eligibility?: string | null;
    registrationUrl?: string | null;
    confidence?: number | null;
    needsReview?: boolean;
  }
) {
  const rawDeadline = input.deadline?.trim() || null;
  const deadline = rawDeadline && /^\d{4}-\d{2}-\d{2}/.test(rawDeadline)
    ? rawDeadline.slice(0, 10)
    : null;
  const daysLeftRaw = computeDaysLeft(deadline);
  const daysLeft = daysLeftRaw >= 9000 ? 0 : daysLeftRaw;
  const priority = computePriority(daysLeftRaw);
  const status =
    input.status ||
    (deadline ? defaultStatus(daysLeftRaw) : "Needs Review");

  const row = await prisma.opportunity.create({
    data: {
      userId,
      title: input.title.trim(),
      organizer: (input.organizer || "Unknown").trim(),
      category: input.category || "Event",
      reward: input.reward?.trim() || "-",
      deadline,
      daysLeft,
      priority,
      status,
      sourceUrl: input.sourceUrl?.trim() || null,
      summary: input.summary?.trim() || null,
      eligibility: input.eligibility?.trim() || null,
      registrationUrl: input.registrationUrl?.trim() || null,
      confidence: input.confidence ?? null,
      needsReview: input.needsReview ?? !deadline,
    },
  });

  return toClientOpportunity(row);
}

export async function updateOpportunityForUser(
  userId: string,
  id: string,
  input: Partial<{
    title: string;
    organizer: string;
    category: string;
    reward: string;
    deadline: string | null;
    status: string;
    priority: string;
    sourceUrl: string | null;
    summary: string | null;
    eligibility: string | null;
    registrationUrl: string | null;
    needsReview: boolean;
  }>
) {
  const existing = await prisma.opportunity.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;

  const deadlineRaw = input.deadline !== undefined ? input.deadline : existing.deadline;
  const deadline =
    typeof deadlineRaw === "string" && /^\d{4}-\d{2}-\d{2}/.test(deadlineRaw)
      ? deadlineRaw.slice(0, 10)
      : deadlineRaw === null
        ? null
        : existing.deadline
          ? existing.deadline.slice(0, 10)
          : null;
  const daysLeftRaw = computeDaysLeft(deadline);
  const daysLeft = daysLeftRaw >= 9000 ? 0 : daysLeftRaw;
  const priority =
    input.priority ?? computePriority(daysLeftRaw);

  const row = await prisma.opportunity.update({
    where: { id },
    data: {
      title: input.title?.trim() ?? existing.title,
      organizer: input.organizer?.trim() ?? existing.organizer,
      category: input.category ?? existing.category,
      reward: input.reward?.trim() ?? existing.reward,
      deadline,
      daysLeft,
      priority,
      status: input.status ?? existing.status,
      sourceUrl:
        input.sourceUrl !== undefined ? input.sourceUrl : existing.sourceUrl,
      summary: input.summary !== undefined ? input.summary : existing.summary,
      eligibility:
        input.eligibility !== undefined ? input.eligibility : existing.eligibility,
      registrationUrl:
        input.registrationUrl !== undefined
          ? input.registrationUrl
          : existing.registrationUrl,
      needsReview:
        input.needsReview !== undefined ? input.needsReview : existing.needsReview,
    },
  });

  return toClientOpportunity(row);
}

export async function deleteOpportunityForUser(userId: string, id: string) {
  const existing = await prisma.opportunity.findFirst({
    where: { id, userId },
  });
  if (!existing) return false;
  await prisma.opportunity.delete({ where: { id } });
  return true;
}
