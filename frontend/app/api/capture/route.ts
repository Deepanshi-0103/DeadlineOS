import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { runCaptureJob } from "@/lib/capture";
import { isImageFile, resolveImageMime } from "@/lib/extract/ingest-image";
import type { CaptureSourceType } from "@/lib/extract/types";

export const runtime = "nodejs";

/**
 * POST /api/capture
 * - JSON: { type: "url"|"text", sourceUrl?, text? }
 * - multipart/form-data: type=pdf|image|url|text + file/fields
 */
export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";

    let sourceType: CaptureSourceType = "url";
    let sourceUrl: string | null = null;
    let text: string | null = null;
    let fileName: string | null = null;
    let pdfBuffer: Buffer | null = null;
    let imageBuffer: Buffer | null = null;
    let mimeType: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const typeRaw = String(form.get("type") || "pdf").toLowerCase();
      sourceType = (["url", "pdf", "text", "image"].includes(typeRaw)
        ? typeRaw
        : "pdf") as CaptureSourceType;

      sourceUrl = (form.get("sourceUrl") as string) || null;
      text = (form.get("text") as string) || null;

      const file = form.get("file");
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const f = file as File;
        fileName = f.name;
        mimeType = f.type || null;
        const bytes = Buffer.from(await f.arrayBuffer());

        if (sourceType === "image" || isImageFile(f.name, f.type)) {
          sourceType = "image";
          imageBuffer = bytes;
          mimeType = resolveImageMime(f.name, f.type);
        } else if (sourceType === "pdf" || f.name.toLowerCase().endsWith(".pdf")) {
          sourceType = "pdf";
          pdfBuffer = bytes;
        } else if (
          f.name.toLowerCase().endsWith(".txt") ||
          f.type.startsWith("text/")
        ) {
          sourceType = "text";
          text = bytes.toString("utf8");
        } else {
          return NextResponse.json(
            { error: "Only PDF, TXT, or image (PNG/JPG/WEBP) uploads are supported." },
            { status: 400 }
          );
        }
      }
    } else {
      const body = await req.json();
      const typeRaw = String(body.type || "url").toLowerCase();
      if (!["url", "pdf", "text", "image"].includes(typeRaw)) {
        return NextResponse.json(
          { error: "type must be url, pdf, text, or image" },
          { status: 400 }
        );
      }
      sourceType = typeRaw as CaptureSourceType;
      sourceUrl = body.sourceUrl || null;
      text = body.text || null;
    }

    if (sourceType === "url" && !sourceUrl) {
      return NextResponse.json(
        { error: "sourceUrl is required for url capture" },
        { status: 400 }
      );
    }
    if (sourceType === "text" && !text?.trim()) {
      return NextResponse.json(
        { error: "text is required for text capture" },
        { status: 400 }
      );
    }
    if (sourceType === "pdf" && !pdfBuffer) {
      return NextResponse.json(
        { error: "PDF file is required for pdf capture" },
        { status: 400 }
      );
    }
    if (sourceType === "image" && !imageBuffer) {
      return NextResponse.json(
        { error: "Image file is required for image capture" },
        { status: 400 }
      );
    }

    const job = await runCaptureJob({
      userId: session.id,
      sourceType,
      sourceUrl,
      text,
      fileName,
      pdfBuffer,
      imageBuffer,
      mimeType,
    });

    const statusCode = job.status === "failed" ? 422 : 201;
    return NextResponse.json(
      {
        success: job.status === "done",
        job,
        opportunity: job.opportunity,
        llmUsed: job.llmUsed ?? false,
        llmError: job.llmError ?? null,
        thinContent: job.thinContent ?? false,
        deduped: job.deduped ?? false,
      },
      { status: statusCode }
    );
  } catch (err: unknown) {
    console.error("[capture POST]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
