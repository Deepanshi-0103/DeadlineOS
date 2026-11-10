import { cleanText } from "./clean";
import { extractTextFromPdf } from "./ingest-pdf";
import { fetchUrlHtml } from "./ingest-url";
import { assertValidImage, resolveImageMime } from "./ingest-image";
import { buildDraft, extractFromHtml } from "./heuristics";
import { llmExtract, llmExtractFromImage, mergeDrafts } from "./llm-extract";
import type { ExtractedDraft, PipelineInput } from "./types";

function isLlmEnabled() {
  return process.env.LLM_EXTRACTION_ENABLED === "true";
}

/**
 * Capture pipeline: ingest → clean → heuristic extract → (optional) LLM refine.
 *
 * Phase B: heuristics always run (fast, free).
 * Phase D: when LLM_EXTRACTION_ENABLED=true, GPT-4o-mini / Gemini refines the draft
 *          for URL/PDF/text (and always when page looks JS-rendered/thin).
 * Image: multimodal vision extract → OCR text → heuristics → merge (requires LLM key).
 */
export async function runCapturePipeline(
  input: PipelineInput
): Promise<{
  draft: ExtractedDraft;
  rawText: string;
  thinContent?: boolean;
  llmError?: string | null;
  llmUsed?: boolean;
}> {
  // ── Image branch (vision-first; still uses heuristics + mergeDrafts) ───────
  if (input.sourceType === "image") {
    return runImagePipeline(input);
  }

  let text = "";
  let titleHint: string | null = null;
  let organizerHint: string | null = null;
  let descriptionHint: string | null = null;
  let deadlineHint: string | null = null;
  let thinContent = false;
  let sourceUrl = input.sourceUrl?.trim() || null;

  // ── Ingestion ──────────────────────────────────────────────────────────────
  if (input.sourceType === "url") {
    if (!sourceUrl) throw new Error("sourceUrl is required for url capture");
    const { html, finalUrl } = await fetchUrlHtml(sourceUrl);
    sourceUrl = finalUrl;
    const parsed = extractFromHtml(html, finalUrl);
    text = parsed.text;
    titleHint = parsed.titleHint;
    organizerHint = parsed.organizerHint;
    descriptionHint = parsed.descriptionHint;
    deadlineHint = parsed.deadlineHint;
    thinContent = parsed.thinContent;
  } else if (input.sourceType === "pdf") {
    if (!input.pdfBuffer?.length) throw new Error("PDF file is required");
    text = await extractTextFromPdf(input.pdfBuffer);
    if (input.fileName) {
      titleHint = input.fileName.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ");
    }
  } else if (input.sourceType === "text") {
    text = cleanText(input.text || "");
    if (!text) throw new Error("text is required for text capture");
    // Prefer explicit Title: line from extension payload
    const titleLine = text.match(/^Title:\s*(.+)$/im)?.[1]?.trim();
    if (titleLine && titleLine.length > 3 && !/dashboard/i.test(titleLine)) {
      titleHint = titleLine.slice(0, 160);
    }
    // Prefer DEADLINE LABELS block for heuristics + LLM
    const labelBlock = text.match(
      /DEADLINE LABELS:\s*([\s\S]*?)(?:\n\nTIME ELEMENTS:|\n\nDEADLINE CONTEXT:|\n\nPAGE TEXT:|$)/i
    )?.[1];
    if (labelBlock?.trim()) {
      text = `DEADLINE LABELS:\n${labelBlock.trim()}\n\n${text}`;
    }
  } else {
    throw new Error("Unsupported sourceType");
  }

  if (!text || text.length < 20) {
    text = text || `Source: ${sourceUrl || input.fileName || "pasted text"}`;
    thinContent = true;
  }

  // ── Phase B: Heuristics ────────────────────────────────────────────────────
  const heuristicDraft = buildDraft({
    text,
    sourceUrl,
    titleHint,
    organizerHint,
    descriptionHint,
    deadlineHint,
    thinContent,
  });

  const rawText = text.slice(0, 20_000);

  // ── Phase D: when flag is on, always refine with LLM (user expects AI) ─────
  if (isLlmEnabled()) {
    console.log(
      `[pipeline] calling LLM (thin=${thinContent}, conf=${heuristicDraft.confidence}, review=${heuristicDraft.needsReview})`
    );
    const { draft: llmResult, error: llmError } = await llmExtract(rawText, heuristicDraft, {
      thinContent,
      sourceUrl,
    });
    if (llmResult) {
      const mergedDraft = mergeDrafts(heuristicDraft, llmResult, { thinContent });
      console.log(
        `[pipeline] LLM merged → confidence=${mergedDraft.confidence}, needsReview=${mergedDraft.needsReview}`
      );
      return { draft: mergedDraft, rawText, thinContent, llmUsed: true, llmError: null };
    }
    console.warn("[pipeline] LLM extraction failed — using heuristic draft:", llmError);
    const draft =
      thinContent && heuristicDraft.needsReview
        ? {
            ...heuristicDraft,
            summary:
              heuristicDraft.summary ||
              "This page looks JavaScript-rendered. Use the DeadlineOS Chrome extension on the open tab for full details.",
          }
        : heuristicDraft;
    return { draft, rawText, thinContent, llmUsed: false, llmError: llmError || "LLM failed" };
  }

  // Thin SPA pages without LLM: point user at extension in summary
  if (thinContent && heuristicDraft.needsReview) {
    return {
      draft: {
        ...heuristicDraft,
        summary:
          heuristicDraft.summary ||
          "This page looks JavaScript-rendered. Use the DeadlineOS Chrome extension on the open tab for full details.",
      },
      rawText,
      thinContent,
      llmUsed: false,
      llmError: null,
    };
  }

  return { draft: heuristicDraft, rawText, thinContent, llmUsed: false, llmError: null };
}

async function runImagePipeline(input: PipelineInput): Promise<{
  draft: ExtractedDraft;
  rawText: string;
  thinContent?: boolean;
  llmError?: string | null;
  llmUsed?: boolean;
}> {
  const mime = resolveImageMime(input.fileName, input.mimeType);
  assertValidImage(input.imageBuffer || Buffer.alloc(0), mime);

  const titleHint = input.fileName
    ? input.fileName.replace(/\.(png|jpe?g|webp)$/i, "").replace(/[-_]+/g, " ").slice(0, 120)
    : "Image capture";

  const { draft: visionDraft, ocrText, error: visionError } = await llmExtractFromImage({
    imageBuffer: input.imageBuffer!,
    mimeType: mime!,
    fileName: input.fileName,
  });

  const text =
    cleanText(ocrText) ||
    [
      visionDraft?.title ? `Title: ${visionDraft.title}` : "",
      visionDraft?.deadline ? `Deadline: ${visionDraft.deadline}` : "",
      visionDraft?.summary || "",
      visionDraft?.organizer ? `Organizer: ${visionDraft.organizer}` : "",
    ]
      .filter(Boolean)
      .join("\n") ||
    `Image upload: ${input.fileName || "flyer"}`;

  const thinContent = text.replace(/\s+/g, " ").trim().length < 80;
  const heuristicDraft = buildDraft({
    text,
    sourceUrl: null,
    titleHint,
    organizerHint: visionDraft?.organizer || null,
    descriptionHint: visionDraft?.summary || null,
    deadlineHint: visionDraft?.deadline || null,
    thinContent,
  });

  const rawText = text.slice(0, 20_000);

  if (visionDraft) {
    const merged = mergeDrafts(heuristicDraft, visionDraft, { thinContent });
    // Image captures without a URL still become inbox cards
    if (!merged.summary || merged.summary.length < 20) {
      merged.summary = merged.summary || "Extracted from uploaded image.";
    }
    console.log(
      `[pipeline] image vision merged → deadline=${merged.deadline ?? "null"} review=${merged.needsReview}`
    );
    return {
      draft: merged,
      rawText,
      thinContent,
      llmUsed: true,
      llmError: null,
    };
  }

  // Vision failed — still persist a Needs Review card from filename / thin OCR
  console.warn("[pipeline] image vision failed:", visionError);
  return {
    draft: {
      ...heuristicDraft,
      needsReview: true,
      summary:
        heuristicDraft.summary ||
        `Could not read this image with AI (${visionError || "vision unavailable"}). Edit the card manually.`,
    },
    rawText,
    thinContent: true,
    llmUsed: false,
    llmError: visionError || "Image vision failed",
  };
}
