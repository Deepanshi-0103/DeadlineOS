/**
 * Phase D — LLM extraction (Gemini by default, OpenAI optional).
 *
 * Reads keys from env:
 *   LLM_PROVIDER=gemini|openai   (default: auto — Gemini if key isn't sk-*)
 *   GEMINI_API_KEY=...           (preferred for Gemini)
 *   OPENAI_API_KEY=...           (OpenAI sk-*, OR Gemini key if you pasted it here)
 */

import OpenAI from "openai";
import type { ExtractedDraft } from "./types";

const CATEGORIES = [
  "Job", "Internship", "Hackathon", "Conference", "Workshop",
  "Scholarship", "Competition", "Fellowship", "Grant", "Event",
] as const;

interface LLMResult {
  title: string;
  organizer: string;
  category: string;
  deadline: string | null;
  reward: string;
  summary: string;
  eligibility: string | null;
  registrationUrl: string | null;
}

const SYSTEM_PROMPT = `You extract structured opportunity data from page text (internships, jobs, hackathons, scholarships, fellowships, conferences, grants, competitions).
Respond ONLY with valid JSON. No markdown fences.

Rules:
- deadline: ISO "YYYY-MM-DD" ONLY. Look hard for Unstop-style dates like "25 Aug'26", "25 Aug 2026", "Registration Deadline", "Application Deadline", "Ends on". Convert 2-digit years (26 → 2026). Prefer dates next to deadline/registration labels over random page dates. NEVER return a date before today's date — use null instead. null only if truly no upcoming deadline on the page.
- category: exactly one of Job, Internship, Hackathon, Conference, Workshop, Scholarship, Competition, Fellowship, Grant, Event
- summary: 1-2 clear sentences (not nav chrome like "Dashboard My Jobs")
- eligibility: who can apply, or null
- reward: prize/stipend/salary or "-"
- registrationUrl: apply/register link if present, else null
- title / organizer: proper opportunity name from H1/Title — NEVER use "Dashboard" or nav labels
- Prefer sections titled DEADLINE LABELS / DEADLINE CONTEXT / TIME ELEMENTS.`;

function resolveProvider(): "gemini" | "openai" {
  const forced = (process.env.LLM_PROVIDER || "").toLowerCase().trim();
  if (forced === "gemini" || forced === "openai") return forced;

  const geminiKey = process.env.GEMINI_API_KEY || "";
  const openKey = process.env.OPENAI_API_KEY || "";

  // Auto: Gemini key in either slot, or non-sk key pasted into OPENAI_API_KEY
  if (geminiKey.length > 20) return "gemini";
  if (openKey.startsWith("sk-")) return "openai";
  if (openKey.length > 20) return "gemini";
  return "gemini";
}

function getGeminiApiKey(): string | null {
  const key = (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "").trim();
  if (!key || key.startsWith("sk-") || key.length < 20) return null;
  return key;
}

function getOpenAIApiKey(): string | null {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key.startsWith("sk-") || key.length < 20) return null;
  return key;
}

function buildUserPrompt(
  text: string,
  heuristic: ExtractedDraft,
  opts?: { thinContent?: boolean; sourceUrl?: string | null }
): string {
  const trimmedText = text.slice(0, 12000);
  const today = new Date().toISOString().slice(0, 10);
  const thinNote = opts?.thinContent
    ? "\nNOTE: Page body may be sparse / JS-rendered. Prefer Title, Description, DEADLINE CONTEXT, and Structured data.\n"
    : "";

  return `Today's date: ${today}
Source URL: ${opts?.sourceUrl || heuristic.sourceUrl || "unknown"}
${thinNote}
Opportunity text:
---
${trimmedText}
---

Regex best-guess (may be wrong):
- Title: ${heuristic.title}
- Organizer: ${heuristic.organizer}
- Category: ${heuristic.category}
- Deadline: ${heuristic.deadline ?? "not found"}
- Reward: ${heuristic.reward}

Return JSON exactly in this shape:
{
  "title": "...",
  "organizer": "...",
  "category": "...",
  "deadline": "YYYY-MM-DD or null",
  "reward": "...",
  "summary": "...",
  "eligibility": "... or null",
  "registrationUrl": "... or null"
}`;
}

function asNullableString(v: unknown, max: number): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t || t.toLowerCase() === "null" || t.toLowerCase() === "n/a") return null;
  return t.slice(0, max);
}

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseAndValidate(raw: string): Partial<LLMResult> | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw)) as Record<string, unknown>;

    let deadline: string | null = null;
    if (typeof obj.deadline === "string") {
      const d = obj.deadline.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) deadline = d;
      else if (/^\d{4}-\d{2}-\d{2}T/.test(d)) deadline = d.slice(0, 10);
    }

    let category = typeof obj.category === "string" ? obj.category.trim() : "Event";
    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
      category = "Event";
    }

    return {
      title: asNullableString(obj.title, 200) || undefined,
      organizer: asNullableString(obj.organizer, 100) || undefined,
      category,
      deadline,
      reward: asNullableString(obj.reward, 120) || undefined,
      summary: asNullableString(obj.summary, 400) || undefined,
      eligibility: asNullableString(obj.eligibility, 300) ?? null,
      registrationUrl: asNullableString(obj.registrationUrl, 500) ?? null,
    };
  } catch {
    return null;
  }
}

async function callGemini(
  text: string,
  heuristicDraft: ExtractedDraft,
  opts?: { thinContent?: boolean; sourceUrl?: string | null }
): Promise<{ draft: Partial<ExtractedDraft> | null; error?: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { draft: null, error: "GEMINI_API_KEY (or Gemini key in OPENAI_API_KEY) missing" };
  }

  const models = [
    process.env.GEMINI_MODEL || "gemini-flash-latest",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
  ].filter((m, i, arr) => arr.indexOf(m) === i);

  const prompt = `${SYSTEM_PROMPT}\n\n${buildUserPrompt(text, heuristicDraft, opts)}`;
  let lastError = "Gemini unavailable";

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 800,
              responseMimeType: "application/json",
            },
          }),
        });

        const data = (await res.json()) as {
          error?: { message?: string; status?: string };
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };

        if (!res.ok) {
          lastError = data.error?.message || `Gemini HTTP ${res.status}`;
          console.warn(`[llm-extract] ${model} attempt ${attempt} → ${res.status}: ${lastError}`);

          if (res.status === 400 || res.status === 401 || res.status === 403) {
            throw new Error(lastError);
          }

          const retryable =
            res.status === 429 ||
            res.status === 503 ||
            /high demand|unavailable|try again|RESOURCE_EXHAUSTED|overloaded/i.test(lastError);

          if (retryable && attempt < 2) {
            await new Promise((r) => setTimeout(r, 1200 * attempt));
            continue;
          }

          if (
            res.status === 404 ||
            /not found|not supported|no longer available/i.test(lastError)
          ) {
            break; // next model
          }
          break;
        }

        const content =
          data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
        if (!content) {
          lastError = "Empty Gemini response";
          break;
        }

        const parsed = parseAndValidate(content);
        if (!parsed) {
          lastError = "Invalid Gemini JSON";
          break;
        }

        console.log(`[llm-extract] Gemini model=${model} deadline=${parsed.deadline ?? "null"}`);
        return { draft: parsed as Partial<ExtractedDraft> };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(`[llm-extract] Gemini model ${model} failed:`, lastError);
        if (/API_KEY|invalid|403|401/i.test(lastError)) break;
      }
    }
  }

  let friendly = lastError;
  if (/API_KEY|invalid|403|401/i.test(lastError)) {
    friendly = "Invalid Gemini API key";
  } else if (/429|quota|RESOURCE_EXHAUSTED/i.test(lastError)) {
    friendly = "Gemini quota exceeded — try again later";
  }
  return { draft: null, error: friendly };
}

async function callOpenAI(
  text: string,
  heuristicDraft: ExtractedDraft,
  opts?: { thinContent?: boolean; sourceUrl?: string | null }
): Promise<{ draft: Partial<ExtractedDraft> | null; error?: string }> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return { draft: null, error: "OPENAI_API_KEY (sk-...) missing" };
  }

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(text, heuristicDraft, opts) },
      ],
      max_tokens: 700,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { draft: null, error: "Empty LLM response" };

    const parsed = parseAndValidate(content);
    if (!parsed) {
      console.warn("[llm-extract] Failed to parse OpenAI response:", content.slice(0, 200));
      return { draft: null, error: "Invalid LLM JSON" };
    }

    return { draft: parsed as Partial<ExtractedDraft> };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[llm-extract] OpenAI call failed:", message);
    let friendly = "LLM unavailable";
    if (/429|quota|billing|credits/i.test(message)) {
      friendly = "OpenAI has no credits / quota exceeded — using heuristics only";
    } else if (/401|invalid.*key|Incorrect API/i.test(message)) {
      friendly = "Invalid OPENAI_API_KEY";
    }
    return { draft: null, error: friendly };
  }
}

export async function llmExtract(
  text: string,
  heuristicDraft: ExtractedDraft,
  opts?: { thinContent?: boolean; sourceUrl?: string | null }
): Promise<{ draft: Partial<ExtractedDraft> | null; error?: string }> {
  const provider = resolveProvider();
  console.log(`[llm-extract] provider=${provider}`);

  if (provider === "openai") {
    return callOpenAI(text, heuristicDraft, opts);
  }
  return callGemini(text, heuristicDraft, opts);
}

const IMAGE_SYSTEM = `You extract structured opportunity / event details from a flyer, poster, screenshot, or photo.
Respond ONLY with valid JSON. No markdown fences.

Rules:
- Read all visible text (OCR). Prefer registration/application deadlines over event start dates.
- deadline: ISO "YYYY-MM-DD" ONLY, or null if none / past relative to today's date provided.
- Convert formats like "28 Sep'26", "25 Aug 2026", "09/28/2026" correctly.
- category: exactly one of Job, Internship, Hackathon, Conference, Workshop, Scholarship, Competition, Fellowship, Grant, Event
- title: event/opportunity name (not "Untitled" unless truly unreadable)
- organizer: host/org if visible, else "Unknown"
- summary: 1-2 sentences from the image content
- eligibility / reward / registrationUrl: from image if present, else null / "-"
- ocrText: plain transcription of important visible text (title, dates, venue, apply info) — max ~1500 chars`;

/**
 * Multimodal extraction from an uploaded image (Gemini preferred; OpenAI vision fallback).
 * Returns structured fields + OCR text so heuristics can still run as a safety net.
 */
export async function llmExtractFromImage(input: {
  imageBuffer: Buffer;
  mimeType: string;
  fileName?: string | null;
}): Promise<{
  draft: Partial<ExtractedDraft> | null;
  ocrText: string;
  error?: string;
}> {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `${IMAGE_SYSTEM}

Today's date: ${today}
File name hint: ${input.fileName || "unknown"}

Return JSON exactly in this shape:
{
  "title": "...",
  "organizer": "...",
  "category": "...",
  "deadline": "YYYY-MM-DD or null",
  "reward": "...",
  "summary": "...",
  "eligibility": "... or null",
  "registrationUrl": "... or null",
  "ocrText": "..."
}`;

  const provider = resolveProvider();
  console.log(`[llm-extract] image provider=${provider} mime=${input.mimeType}`);

  if (provider === "openai") {
    return callOpenAIVision(input.imageBuffer, input.mimeType, prompt);
  }
  return callGeminiVision(input.imageBuffer, input.mimeType, prompt);
}

async function callGeminiVision(
  imageBuffer: Buffer,
  mimeType: string,
  prompt: string
): Promise<{ draft: Partial<ExtractedDraft> | null; ocrText: string; error?: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      draft: null,
      ocrText: "",
      error: "GEMINI_API_KEY required for image extraction",
    };
  }

  const models = [
    process.env.GEMINI_MODEL || "gemini-flash-latest",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
  ].filter((m, i, arr) => arr.indexOf(m) === i);

  const b64 = imageBuffer.toString("base64");
  let lastError = "Gemini vision unavailable";

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType: mimeType, data: b64 } },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 1200,
              responseMimeType: "application/json",
            },
          }),
        });

        const data = (await res.json()) as {
          error?: { message?: string };
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };

        if (!res.ok) {
          lastError = data.error?.message || `Gemini HTTP ${res.status}`;
          console.warn(`[llm-extract] vision ${model} attempt ${attempt} → ${res.status}: ${lastError}`);
          if (res.status === 400 || res.status === 401 || res.status === 403) {
            throw new Error(lastError);
          }
          const retryable =
            res.status === 429 ||
            res.status === 503 ||
            /high demand|unavailable|try again|RESOURCE_EXHAUSTED|overloaded/i.test(lastError);
          if (retryable && attempt < 2) {
            await new Promise((r) => setTimeout(r, 1200 * attempt));
            continue;
          }
          if (res.status === 404 || /not found|not supported|no longer available/i.test(lastError)) {
            break;
          }
          break;
        }

        const content =
          data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
        if (!content) {
          lastError = "Empty Gemini vision response";
          break;
        }

        const parsed = parseAndValidate(content);
        if (!parsed) {
          lastError = "Invalid Gemini vision JSON";
          break;
        }

        let ocrText = "";
        try {
          const obj = JSON.parse(stripJsonFences(content)) as Record<string, unknown>;
          if (typeof obj.ocrText === "string") ocrText = obj.ocrText.slice(0, 4000);
        } catch {
          /* ignore */
        }

        console.log(
          `[llm-extract] Gemini vision model=${model} deadline=${parsed.deadline ?? "null"}`
        );
        return { draft: parsed as Partial<ExtractedDraft>, ocrText };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(`[llm-extract] Gemini vision ${model} failed:`, lastError);
        if (/API_KEY|invalid|403|401/i.test(lastError)) break;
      }
    }
  }

  let friendly = lastError;
  if (/API_KEY|invalid|403|401/i.test(lastError)) friendly = "Invalid Gemini API key";
  else if (/429|quota|RESOURCE_EXHAUSTED/i.test(lastError)) {
    friendly = "Gemini quota exceeded — try again later";
  }
  return { draft: null, ocrText: "", error: friendly };
}

async function callOpenAIVision(
  imageBuffer: Buffer,
  mimeType: string,
  prompt: string
): Promise<{ draft: Partial<ExtractedDraft> | null; ocrText: string; error?: string }> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return {
      draft: null,
      ocrText: "",
      error: "OPENAI_API_KEY (sk-...) required for image extraction",
    };
  }

  const client = new OpenAI({ apiKey });
  const dataUrl = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { draft: null, ocrText: "", error: "Empty vision response" };

    const parsed = parseAndValidate(content);
    if (!parsed) return { draft: null, ocrText: "", error: "Invalid vision JSON" };

    let ocrText = "";
    try {
      const obj = JSON.parse(stripJsonFences(content)) as Record<string, unknown>;
      if (typeof obj.ocrText === "string") ocrText = obj.ocrText.slice(0, 4000);
    } catch {
      /* ignore */
    }

    return { draft: parsed as Partial<ExtractedDraft>, ocrText };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[llm-extract] OpenAI vision failed:", message);
    let friendly = "Vision LLM unavailable";
    if (/429|quota|billing|credits/i.test(message)) {
      friendly = "OpenAI has no credits / quota exceeded";
    } else if (/401|invalid.*key|Incorrect API/i.test(message)) {
      friendly = "Invalid OPENAI_API_KEY";
    }
    return { draft: null, ocrText: "", error: friendly };
  }
}

export function mergeDrafts(
  heuristic: ExtractedDraft,
  llm: Partial<ExtractedDraft>,
  opts?: { thinContent?: boolean }
): ExtractedDraft {
  const todayIso = new Date().toISOString().slice(0, 10);
  let deadline = llm.deadline ?? heuristic.deadline;
  // Reject past LLM deadlines (common hallucination / copyright years)
  if (deadline && deadline < todayIso) {
    deadline = heuristic.deadline && heuristic.deadline >= todayIso
      ? heuristic.deadline
      : null;
  }
  const deadlineFound = !!deadline;

  let confidence = 0.58;
  if (llm.title && llm.title !== heuristic.title) confidence += 0.08;
  if (deadlineFound) confidence += 0.25;
  if (llm.eligibility) confidence += 0.05;
  if (llm.summary && llm.summary.length > 40) confidence += 0.05;
  if (opts?.thinContent && !deadlineFound) confidence = Math.min(confidence, 0.55);
  confidence = Math.min(0.98, Math.round(confidence * 100) / 100);

  const needsReview =
    !deadlineFound ||
    confidence < 0.65 ||
    (!!opts?.thinContent && !deadlineFound);

  let title = llm.title || heuristic.title;
  // Prefer cleaner LLM title when heuristic looks like a URL slug
  if (
    llm.title &&
    !/dashboard|my jobs/i.test(llm.title) &&
    (/dashboard|my jobs/i.test(heuristic.title) || /[-\s]\d{5,}$/.test(heuristic.title))
  ) {
    title = llm.title;
  }
  if (/dashboard|my jobs|internships jobs competitions/i.test(title)) {
    title = llm.title && !/dashboard/i.test(llm.title) ? llm.title : "Untitled opportunity";
  }

  let summary = llm.summary || heuristic.summary;
  if (summary && /dashboard my jobs/i.test(summary)) {
    summary = llm.summary && !/dashboard/i.test(llm.summary) ? llm.summary : heuristic.summary;
  }
  if (opts?.thinContent && needsReview) {
    const tip =
      " Tip: open the page and use the DeadlineOS Chrome extension for JS-rendered content.";
    if (!summary?.includes("Chrome extension")) {
      summary = `${summary || "Limited details from server-side fetch."}${tip}`;
    }
  }

  return {
    title: title || heuristic.title,
    organizer: llm.organizer || heuristic.organizer,
    category: llm.category || heuristic.category,
    deadline,
    reward: llm.reward || heuristic.reward,
    summary: summary || heuristic.summary,
    eligibility: llm.eligibility ?? heuristic.eligibility,
    registrationUrl: llm.registrationUrl || heuristic.registrationUrl || heuristic.sourceUrl,
    confidence,
    needsReview,
    sourceUrl: heuristic.sourceUrl,
  };
}
