import { prisma } from "./prisma";
import {
  computeDaysLeft,
  createOpportunityForUser,
  defaultStatus,
  normalizeOpportunityUrl,
  toClientOpportunity,
  updateOpportunityForUser,
  type OpportunityRecord,
} from "./opportunities";
import { runCapturePipeline } from "./extract/run-pipeline";
import type { CaptureSourceType, ExtractedDraft } from "./extract/types";
import type { Opportunity } from "./types";

export type CaptureJobView = {
  id: string;
  sourceType: string;
  sourceUrl: string | null;
  fileName: string | null;
  status: string;
  error: string | null;
  opportunityId: string | null;
  opportunity: Opportunity | null;
  createdAt: string;
  updatedAt: string;
  llmUsed?: boolean;
  llmError?: string | null;
  thinContent?: boolean;
  deduped?: boolean;
};

function mapJob(
  job: {
    id: string;
    sourceType: string;
    sourceUrl: string | null;
    fileName: string | null;
    status: string;
    error: string | null;
    opportunityId: string | null;
    createdAt: Date;
    updatedAt: Date;
    opportunity?: OpportunityRecord | null;
  }
): CaptureJobView {
  return {
    id: job.id,
    sourceType: job.sourceType,
    sourceUrl: job.sourceUrl,
    fileName: job.fileName,
    status: job.status,
    error: job.error,
    opportunityId: job.opportunityId,
    opportunity: job.opportunity ? toClientOpportunity(job.opportunity) : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

async function findExistingOpportunity(
  userId: string,
  draft: ExtractedDraft
) {
  const urls = [
    normalizeOpportunityUrl(draft.sourceUrl),
    normalizeOpportunityUrl(draft.registrationUrl),
  ].filter(Boolean) as string[];

  if (urls.length === 0) return null;

  const rows = await prisma.opportunity.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    rows.find((row) => {
      const a = normalizeOpportunityUrl(row.sourceUrl);
      const b = normalizeOpportunityUrl(row.registrationUrl);
      return (a && urls.includes(a)) || (b && urls.includes(b));
    }) || null
  );
}

async function persistDraft(userId: string, draft: ExtractedDraft) {
  const todayIso = new Date().toISOString().slice(0, 10);
  // Never persist past deadlines
  const cleanDeadline =
    draft.deadline && draft.deadline >= todayIso ? draft.deadline : null;

  const daysLeft = computeDaysLeft(cleanDeadline);
  const status = draft.needsReview || !cleanDeadline
    ? "Needs Review"
    : defaultStatus(daysLeft);

  const existing = await findExistingOpportunity(userId, draft);

  if (existing) {
    const updated = await updateOpportunityForUser(userId, existing.id, {
      title: draft.title,
      organizer: draft.organizer,
      category: draft.category,
      reward: draft.reward,
      deadline: cleanDeadline,
      status,
      sourceUrl: draft.sourceUrl || draft.registrationUrl || existing.sourceUrl,
      summary: draft.summary,
      eligibility: draft.eligibility,
      registrationUrl: draft.registrationUrl || existing.registrationUrl,
      needsReview: draft.needsReview || !cleanDeadline,
    });
    return { opportunity: updated!, deduped: true };
  }

  const opportunity = await createOpportunityForUser(userId, {
    title: draft.title,
    organizer: draft.organizer,
    category: draft.category,
    reward: draft.reward,
    deadline: cleanDeadline,
    status,
    sourceUrl: draft.registrationUrl || draft.sourceUrl,
    summary: draft.summary,
    eligibility: draft.eligibility,
    registrationUrl: draft.registrationUrl,
    confidence: draft.confidence,
    needsReview: draft.needsReview || !cleanDeadline,
  });

  return { opportunity, deduped: false };
}

export async function runCaptureJob(input: {
  userId: string;
  sourceType: CaptureSourceType;
  sourceUrl?: string | null;
  text?: string | null;
  fileName?: string | null;
  pdfBuffer?: Buffer | null;
  imageBuffer?: Buffer | null;
  mimeType?: string | null;
}) {
  const job = await prisma.captureJob.create({
    data: {
      userId: input.userId,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl || null,
      rawText: input.text?.slice(0, 20_000) || null,
      fileName: input.fileName || null,
      status: "processing",
    },
  });

  try {
    const { draft, rawText, llmUsed, llmError, thinContent } = await runCapturePipeline({
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl,
      text: input.text,
      fileName: input.fileName,
      pdfBuffer: input.pdfBuffer,
      imageBuffer: input.imageBuffer,
      mimeType: input.mimeType,
    });

    // Prefer capture URL on the draft for dedupe
    if (!draft.sourceUrl && input.sourceUrl) {
      draft.sourceUrl = input.sourceUrl;
    }

    const { opportunity, deduped } = await persistDraft(input.userId, draft);

    const updated = await prisma.captureJob.update({
      where: { id: job.id },
      data: {
        status: "done",
        rawText,
        opportunityId: opportunity.id,
        error: llmError && !llmUsed ? `llm_fallback: ${llmError}` : null,
      },
      include: { opportunity: true },
    });

    return {
      ...mapJob(updated),
      opportunity, // use upserted client shape
      llmUsed: !!llmUsed,
      llmError: llmError || null,
      thinContent: !!thinContent,
      deduped,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Capture failed";
    const failed = await prisma.captureJob.update({
      where: { id: job.id },
      data: { status: "failed", error: message },
    });
    return mapJob(failed);
  }
}

export async function getCaptureJobForUser(userId: string, id: string) {
  const job = await prisma.captureJob.findFirst({
    where: { id, userId },
    include: { opportunity: true },
  });
  if (!job) return null;
  return mapJob(job);
}
