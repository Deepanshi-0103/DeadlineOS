import { cleanText } from "./clean";

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  if (buffer.byteLength > MAX_PDF_BYTES) {
    throw new Error("PDF exceeds 15MB limit");
  }

  // pdf-parse is CJS; dynamic import keeps Next bundling happier
  const pdfParse = (await import("pdf-parse")).default as (
    data: Buffer
  ) => Promise<{ text: string }>;

  const result = await pdfParse(buffer);
  const text = cleanText(result.text || "");
  if (!text) {
    throw new Error("Could not extract text from PDF");
  }
  return text;
}
