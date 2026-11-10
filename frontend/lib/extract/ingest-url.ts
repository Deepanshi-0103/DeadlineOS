const MAX_BYTES = 2_000_000; // ~2MB HTML cap
const TIMEOUT_MS = 15_000;

/**
 * Fetch page HTML with browser-like headers.
 * Many sites block bare bots; a realistic UA improves static HTML yield.
 * JS-hydrated SPAs still return thin shells — pipeline detects that.
 */
export async function fetchUrlHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch URL (${res.status})`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml") &&
      !contentType.includes("application/xml")
    ) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      throw new Error("Page is too large to ingest");
    }

    return {
      html: buf.toString("utf8"),
      finalUrl: res.url || url,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Timed out fetching URL (site too slow or blocked)");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
