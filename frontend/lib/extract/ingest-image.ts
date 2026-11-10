/** Image upload helpers for capture pipeline (PNG / JPEG / WEBP). */

export const IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export function isImageFile(fileName?: string | null, mimeType?: string | null): boolean {
  const mime = (mimeType || "").toLowerCase().trim();
  if (mime && IMAGE_MIME_TYPES.has(mime === "image/jpg" ? "image/jpeg" : mime)) {
    return true;
  }
  const ext = (fileName || "").split(".").pop()?.toLowerCase();
  return !!ext && ext in EXT_TO_MIME;
}

export function resolveImageMime(
  fileName?: string | null,
  mimeType?: string | null
): string | null {
  const mime = (mimeType || "").toLowerCase().trim();
  if (mime === "image/jpg") return "image/jpeg";
  if (IMAGE_MIME_TYPES.has(mime)) return mime;
  const ext = (fileName || "").split(".").pop()?.toLowerCase();
  return (ext && EXT_TO_MIME[ext]) || null;
}

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB — keeps Gemini base64 payload reasonable

export function assertValidImage(buffer: Buffer, mime: string | null) {
  if (!buffer?.length) throw new Error("Image file is required");
  if (!mime || !IMAGE_MIME_TYPES.has(mime)) {
    throw new Error("Unsupported image type — use PNG, JPG, or WEBP");
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image too large — max 8MB");
  }
}
