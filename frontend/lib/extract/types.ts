export type CaptureSourceType = "url" | "pdf" | "text" | "image";

export interface ExtractedDraft {
  title: string;
  organizer: string;
  category: string;
  reward: string;
  deadline: string | null;
  summary: string;
  eligibility: string | null;
  registrationUrl: string | null;
  confidence: number;
  needsReview: boolean;
  sourceUrl: string | null;
}

export interface PipelineInput {
  sourceType: CaptureSourceType;
  sourceUrl?: string | null;
  text?: string | null;
  fileName?: string | null;
  pdfBuffer?: Buffer | null;
  /** Raw image bytes for sourceType === "image" */
  imageBuffer?: Buffer | null;
  /** MIME for image (image/png | image/jpeg | image/webp) */
  mimeType?: string | null;
}
