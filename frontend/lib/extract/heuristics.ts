import { htmlToText, metaContent, tagText } from "./clean";
import type { ExtractedDraft } from "./types";
import { organizerFromUrl, titleFromUrl } from "@/lib/opportunities";

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9,
  oct: 10, nov: 11, dec: 12,
};

const CATEGORY_RULES: { category: string; pattern: RegExp }[] = [
  { category: "Internship", pattern: /\bintern(ship)?s?\b/i },
  { category: "Hackathon", pattern: /\bhackathon\b|\bhack\s*day\b/i },
  { category: "Scholarship", pattern: /\bscholarship\b|\bbursary\b/i },
  { category: "Fellowship", pattern: /\bfellowship\b/i },
  { category: "Conference", pattern: /\bconference\b|\bcfp\b|\bcall for (papers|speakers)\b/i },
  { category: "Competition", pattern: /\bcompetition\b|\bcontest\b|\bprize\b/i },
  { category: "Grant", pattern: /\bgrant\b|\bfunding\b|\baccelerator\b/i },
  { category: "Job", pattern: /\b(job|career|hiring|full[-\s]?time|new grad)\b/i },
  { category: "Workshop", pattern: /\bworkshop\b/i },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(y: number, m: number, d: number): string | null {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Score how strongly a snippet looks like a registration/application deadline. */
function deadlineLabelScore(snippet: string): number {
  if (
    /registration\s*deadline|application\s*deadline|last\s*date\s*to\s*apply|last\s*day\s*to\s*apply|apply\s*by|register\s*by|submission\s*deadline/i.test(
      snippet
    )
  ) {
    return 4;
  }
  if (/deadline|due\s*date|closes?\s*on|closing\s*date|last\s*date/i.test(snippet)) {
    return 3;
  }
  if (/registration|submission|ends?\s*on|apply|closes?/i.test(snippet)) {
    return 2;
  }
  return 0;
}

type ScoredDate = { iso: string; score: number };

/** Find the best upcoming deadline-like date in text (past dates ignored). */
export function extractDeadline(text: string): { deadline: string | null; hit: boolean } {
  const scored: ScoredDate[] = [];

  const push = (iso: string | null, context: string) => {
    if (!iso) return;
    scored.push({ iso, score: deadlineLabelScore(context) });
  };

  // Explicit Unstop block: "Registration Deadline" then date nearby (same/next lines)
  const unstopBlock =
    /registration\s*deadline[\s|:.\-]*\n?\s*(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s*['’]?(\d{2,4})\b/gi;
  for (const m of text.matchAll(unstopBlock)) {
    const month = MONTHS[m[2].toLowerCase().replace(".", "")];
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    push(toIso(y, month, Number(m[1])), m[0]);
  }

  // ISO / YYYY-MM-DD
  for (const m of text.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) {
    const ctx = text.slice(Math.max(0, m.index! - 48), m.index! + m[0].length + 12);
    push(toIso(Number(m[1]), Number(m[2]), Number(m[3])), ctx);
  }

  // Unstop-style: 25 Aug'26  |  25 Aug 2026  |  25 Aug 26
  const ddMonYy =
    /\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s*['’]?(\d{2,4})\b/gi;
  for (const m of text.matchAll(ddMonYy)) {
    const month = MONTHS[m[2].toLowerCase().replace(".", "")];
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    const ctx = text.slice(Math.max(0, m.index! - 48), m.index! + m[0].length + 8);
    push(toIso(y, month, Number(m[1])), ctx);
  }

  // Month DD, YYYY | Month DD 'YY
  const monthFirst =
    /\b((jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*['’]?(20\d{2}|\d{2}))\b/gi;
  for (const m of text.matchAll(monthFirst)) {
    const month = MONTHS[m[2].toLowerCase().replace(".", "")];
    let y = Number(m[4]);
    if (y < 100) y += 2000;
    const ctx = text.slice(Math.max(0, m.index! - 48), m.index! + m[0].length + 8);
    push(toIso(y, month, Number(m[3])), ctx);
  }

  // DD/MM/YYYY or MM/DD/YYYY near deadline words
  const slashNear =
    /\b(?:deadline|due|apply by|closes?|registration)\b[^\n.]{0,30}?\b(\d{1,2})[\/.](\d{1,2})[\/.](20\d{2}|\d{2})\b/gi;
  for (const m of text.matchAll(slashNear)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    const iso =
      a > 12 ? toIso(y, b, a) : b > 12 ? toIso(y, a, b) : toIso(y, b, a); // prefer DD/MM
    push(iso, m[0]);
  }

  if (scored.length === 0) return { deadline: null, hit: false };

  const today = new Date();
  const todayIso = `${today.getUTCFullYear()}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;

  const upcoming = scored.filter((s) => s.iso >= todayIso);
  if (!upcoming.length) return { deadline: null, hit: false };

  // Prefer strongly labeled registration deadlines; then soonest date among tied scores
  upcoming.sort((a, b) => b.score - a.score || a.iso.localeCompare(b.iso));
  const bestScore = upcoming[0].score;
  // If we only found unlabeled dates (score 0), still use soonest — but only one
  const pool = upcoming.filter((s) => s.score === bestScore);
  return { deadline: pool[0].iso, hit: true };
}

export function detectCategory(text: string): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(text)) return rule.category;
  }
  return "Event";
}

export function extractEligibility(text: string): string | null {
  const m = text.match(
    /(?:eligibility|eligible|who can apply|requirements)\s*[:\-]?\s*([^\n]{20,220})/i
  );
  return m?.[1]?.trim().slice(0, 240) || null;
}

export function extractReward(text: string): string | null {
  const m = text.match(
    /(?:prize|stipend|reward|compensation|salary|award)\s*[:\-]?\s*([^\n]{5,120})/i
  );
  if (m?.[1]) return m[1].trim();
  const money = text.match(/\$\s?[\d,]+(?:\s?(?:k|K|USD|\/\s?mo(?:nth)?)?)/);
  return money?.[0] || null;
}

export function extractSummary(text: string): string {
  const skip =
    /^(eligibility|deadline|due|reward|prize|organizer|category|apply|source|title)\s*[:\-]/i;
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 40 && l.length < 280)
    .filter((l) => !/^https?:\/\//i.test(l))
    .filter((l) => !skip.test(l));
  return (lines[0] || text.slice(0, 200)).trim();
}

/** Pull useful string fields out of application/ld+json blocks. */
function extractJsonLdHints(html: string): {
  title: string | null;
  organizer: string | null;
  description: string | null;
  deadline: string | null;
  extraText: string;
} {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let title: string | null = null;
  let organizer: string | null = null;
  let description: string | null = null;
  let deadline: string | null = null;
  const chunks: string[] = [];

  for (const m of blocks) {
    try {
      const data = JSON.parse(m[1].trim());
      const nodes = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const n = node as Record<string, unknown>;
        if (!title && typeof n.name === "string") title = n.name;
        if (!title && typeof n.headline === "string") title = n.headline;
        if (!description && typeof n.description === "string") description = n.description;
        if (!deadline) {
          const d =
            (typeof n.validThrough === "string" && n.validThrough) ||
            (typeof n.endDate === "string" && n.endDate) ||
            (typeof n.applicationDeadline === "string" && n.applicationDeadline) ||
            null;
          if (d && /^\d{4}-\d{2}-\d{2}/.test(d)) deadline = d.slice(0, 10);
        }
        const org = n.organizer || n.hiringOrganization || n.publisher;
        if (!organizer && org && typeof org === "object") {
          const name = (org as Record<string, unknown>).name;
          if (typeof name === "string") organizer = name;
        }
        if (!organizer && typeof n.organizer === "string") organizer = n.organizer;
        chunks.push(JSON.stringify(n));
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return {
    title,
    organizer,
    description,
    deadline,
    extraText: chunks.join("\n").slice(0, 8000),
  };
}

export function extractFromHtml(
  html: string,
  _sourceUrl: string
): {
  text: string;
  titleHint: string | null;
  organizerHint: string | null;
  descriptionHint: string | null;
  deadlineHint: string | null;
  thinContent: boolean;
} {
  const ogTitle = metaContent(html, "og:title");
  const twTitle = metaContent(html, "twitter:title");
  const docTitle = tagText(html, "title");
  const h1 = tagText(html, "h1");
  const siteName = metaContent(html, "og:site_name");
  const ogDesc = metaContent(html, "og:description");
  const metaDesc = metaContent(html, "description");
  const twDesc = metaContent(html, "twitter:description");
  const jsonLd = extractJsonLdHints(html);

  const titleHint = jsonLd.title || ogTitle || twTitle || h1 || docTitle;
  const organizerHint = jsonLd.organizer || siteName;
  const descriptionHint = jsonLd.description || ogDesc || twDesc || metaDesc;

  const main =
    html.match(/<main[\s\S]*?<\/main>/i)?.[0] ||
    html.match(/<article[\s\S]*?<\/article>/i)?.[0] ||
    html;

  let bodyText = htmlToText(main);

  // SPA / bot shells: body is tiny — stitch meta + JSON-LD so LLM still has signal
  const thinContent = bodyText.replace(/\s+/g, " ").trim().length < 280;
  if (thinContent || descriptionHint || jsonLd.extraText) {
    const parts = [
      titleHint ? `Title: ${titleHint}` : "",
      organizerHint ? `Organizer: ${organizerHint}` : "",
      descriptionHint ? `Description: ${descriptionHint}` : "",
      jsonLd.deadline ? `Deadline hint: ${jsonLd.deadline}` : "",
      bodyText,
      jsonLd.extraText ? `Structured data:\n${jsonLd.extraText}` : "",
    ].filter(Boolean);
    bodyText = parts.join("\n\n");
  }

  return {
    text: bodyText,
    titleHint: titleHint ? titleHint.trim() : null,
    organizerHint: organizerHint ? organizerHint.trim() : null,
    descriptionHint: descriptionHint ? descriptionHint.trim() : null,
    deadlineHint: jsonLd.deadline,
    thinContent,
  };
}

export function extractOrganizer(text: string): string | null {
  const m = text.match(
    /(?:organizer|organised by|organized by|host(?:ed)? by|presented by)\s*[:\-]?\s*([^\n]{2,80})/i
  );
  return m?.[1]?.trim().replace(/\s+/g, " ").slice(0, 80) || null;
}

export function buildDraft(args: {
  text: string;
  sourceUrl?: string | null;
  titleHint?: string | null;
  organizerHint?: string | null;
  descriptionHint?: string | null;
  deadlineHint?: string | null;
  thinContent?: boolean;
}): ExtractedDraft {
  const {
    text,
    sourceUrl,
    titleHint,
    organizerHint,
    descriptionHint,
    deadlineHint,
    thinContent,
  } = args;

  const extracted = extractDeadline(text);
  const todayIso = new Date().toISOString().slice(0, 10);
  const hintOk =
    deadlineHint && /^\d{4}-\d{2}-\d{2}/.test(deadlineHint) && deadlineHint.slice(0, 10) >= todayIso
      ? deadlineHint.slice(0, 10)
      : null;
  const deadline = extracted.deadline || hintOk || null;
  const deadlineHit = !!deadline;
  const category = detectCategory(text);
  const eligibility = extractEligibility(text);
  const reward = extractReward(text) || "-";
  const summary =
    (descriptionHint && descriptionHint.slice(0, 280)) || extractSummary(text);

  const firstLine =
    text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 8 && !/^https?:\/\//i.test(l) && !/^source:/i.test(l))
      ?.slice(0, 160) || null;

  const urlTitle = sourceUrl ? titleFromUrl(sourceUrl) : null;
  const urlTitleIsWeak =
    !!urlTitle &&
    (/^(www\.)?[a-z0-9.-]+\.[a-z]{2,}$/i.test(urlTitle) || urlTitle.split(" ").length <= 2);

  const title =
    titleHint?.slice(0, 160) ||
    (firstLine && (!urlTitle || urlTitleIsWeak) ? firstLine : null) ||
    urlTitle ||
    firstLine ||
    "Untitled opportunity";

  const organizer =
    organizerHint ||
    extractOrganizer(text) ||
    (sourceUrl ? organizerFromUrl(sourceUrl) : "Unknown");

  let confidence = 0.35;
  if (titleHint) confidence += 0.2;
  if (deadlineHit) confidence += 0.3;
  if (category !== "Event") confidence += 0.1;
  if (eligibility) confidence += 0.05;
  if (descriptionHint) confidence += 0.05;
  if (thinContent) confidence = Math.min(confidence, 0.45);
  confidence = Math.min(0.95, Math.round(confidence * 100) / 100);

  const needsReview = !deadlineHit || confidence < 0.55 || !!thinContent;

  return {
    title,
    organizer,
    category,
    reward,
    deadline,
    summary,
    eligibility,
    registrationUrl: sourceUrl || null,
    confidence,
    needsReview,
    sourceUrl: sourceUrl || null,
  };
}
