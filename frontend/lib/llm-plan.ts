/**
 * Gemini tool-style day planner.
 * Proposes timed blocks via function calling; server validates before persist.
 */

export type ProposedBlock = {
  taskId: string | null;
  title: string;
  startTime: string; // HH:mm
  endTime: string;
  category: string;
  reason?: string;
};

export type LlmPlanProposal = {
  blocks: ProposedBlock[];
  suggestion: string | null;
};

export type PlanContextTask = {
  id: string;
  title: string;
  category: string;
  priority: string;
  durationMin: number;
  dueAt: string | null;
  goalTitle: string | null;
};

export type PlanContextOpp = {
  id: string;
  title: string;
  category: string;
  daysLeft: number;
  deadline: string | null;
};

function getGeminiApiKey(): string | null {
  const key = (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "").trim();
  if (!key || key.startsWith("sk-") || key.length < 20) return null;
  return key;
}

export function isLlmPlanEnabled(): boolean {
  const flag = (process.env.LLM_PLAN_ENABLED || "").toLowerCase().trim();
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return true;
  // Auto-on when extraction is enabled and a Gemini key exists
  return (
    (process.env.LLM_EXTRACTION_ENABLED || "").toLowerCase() === "true" &&
    !!getGeminiApiKey()
  );
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidTime(t: string): boolean {
  return TIME_RE.test(t);
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Validate and normalize Gemini / tool output against known tasks */
export function validateProposedBlocks(
  raw: ProposedBlock[],
  tasks: PlanContextTask[],
  focusStart: number,
  focusEnd: number
): ProposedBlock[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const used = new Set<string>();
  const out: ProposedBlock[] = [];

  const sorted = [...raw]
    .filter((b) => b && isValidTime(b.startTime) && isValidTime(b.endTime))
    .filter((b) => toMinutes(b.endTime) > toMinutes(b.startTime))
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  let lastEnd = focusStart * 60;

  for (const b of sorted) {
    if (out.length >= 7) break;

    let start = toMinutes(b.startTime);
    let end = toMinutes(b.endTime);
    if (start < focusStart * 60) start = focusStart * 60;
    if (end > focusEnd * 60) end = focusEnd * 60;
    if (end <= start) continue;
    if (start < lastEnd) {
      // push after previous block
      const dur = end - start;
      start = lastEnd;
      end = start + dur;
      if (end > focusEnd * 60) continue;
    }

    let taskId = b.taskId && byId.has(b.taskId) ? b.taskId : null;
    if (taskId && used.has(taskId)) taskId = null;
    if (taskId) used.add(taskId);

    const task = taskId ? byId.get(taskId) : null;
    const title = (b.title || task?.title || "").trim().slice(0, 200);
    if (!title || title.includes("[Example]")) continue;

    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (mins: number) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;

    out.push({
      taskId,
      title,
      startTime: fmt(start),
      endTime: fmt(end),
      category: (b.category || task?.category || "General").slice(0, 40),
      reason: b.reason?.slice(0, 200),
    });
    lastEnd = end + 10; // small buffer
  }

  return out;
}

export async function proposeDayPlanWithGemini(input: {
  date: string;
  focusStart: number;
  focusEnd: number;
  preferMorning: boolean;
  tasks: PlanContextTask[];
  opportunities: PlanContextOpp[];
}): Promise<{ proposal: LlmPlanProposal | null; error?: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return { proposal: null, error: "GEMINI_API_KEY missing" };

  const models = [
    process.env.GEMINI_MODEL || "gemini-flash-latest",
    "gemini-flash-latest",
    "gemini-2.0-flash",
  ].filter((m, i, arr) => arr.indexOf(m) === i);

  const tool = {
    functionDeclarations: [
      {
        name: "propose_day_plan",
        description:
          "Propose a realistic timed day plan from the user's open tasks and urgent opportunities.",
        parameters: {
          type: "OBJECT",
          properties: {
            suggestion: {
              type: "STRING",
              description: "Short coaching tip for the user (1-2 sentences).",
            },
            blocks: {
              type: "ARRAY",
              description: "Ordered timed blocks for the day (max 7).",
              items: {
                type: "OBJECT",
                properties: {
                  taskId: {
                    type: "STRING",
                    description:
                      "Existing task id from the list, or empty string for a Prep/opportunity block",
                  },
                  title: { type: "STRING" },
                  startTime: { type: "STRING", description: "HH:mm 24h" },
                  endTime: { type: "STRING", description: "HH:mm 24h" },
                  category: { type: "STRING" },
                  reason: { type: "STRING" },
                },
                required: ["title", "startTime", "endTime", "category"],
              },
            },
          },
          required: ["blocks", "suggestion"],
        },
      },
    ],
  };

  const userPrompt = `Date: ${input.date}
Focus window: ${input.focusStart}:00–${input.focusEnd}:00
Prefer morning: ${input.preferMorning}

Open tasks (use these ids when scheduling):
${JSON.stringify(input.tasks, null, 2)}

Urgent opportunities (optional Prep: blocks, daysLeft ≤ 5):
${JSON.stringify(input.opportunities, null, 2)}

Rules:
- Call propose_day_plan exactly once.
- Schedule at most 6 task blocks + optional prep blocks (max 7 total).
- Respect each task's durationMin when possible; leave ~10–15 min buffers.
- Prioritize high priority and sooner dueAt first.
- Do not invent taskIds — only use ids from the list, or null for Prep blocks.
- Stay inside the focus window.
- Titles must match the task title when taskId is set.`;

  let lastError = "Gemini planner unavailable";

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          tools: [tool],
          toolConfig: {
            functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["propose_day_plan"] },
          },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
      });

      const data = (await res.json()) as {
        error?: { message?: string };
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
              functionCall?: { name?: string; args?: Record<string, unknown> };
            }>;
          };
        }>;
      };

      if (!res.ok) {
        lastError = data.error?.message || `Gemini HTTP ${res.status}`;
        console.warn(`[llm-plan] ${model} → ${res.status}: ${lastError}`);
        if (res.status === 404 || /not found|not supported/i.test(lastError)) continue;
        if (res.status === 401 || res.status === 403) break;
        continue;
      }

      const parts = data.candidates?.[0]?.content?.parts || [];
      let args: Record<string, unknown> | null = null;

      for (const part of parts) {
        if (part.functionCall?.name === "propose_day_plan" && part.functionCall.args) {
          args = part.functionCall.args;
          break;
        }
      }

      // Fallback: some models return JSON text instead of functionCall
      if (!args) {
        const text = parts.map((p) => p.text || "").join("").trim();
        if (text) {
          try {
            const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
            args = JSON.parse(cleaned) as Record<string, unknown>;
          } catch {
            /* ignore */
          }
        }
      }

      if (!args || !Array.isArray(args.blocks)) {
        lastError = "No propose_day_plan tool result";
        continue;
      }

      const rawBlocks = (args.blocks as ProposedBlock[]).map((b) => {
        const tid =
          typeof b.taskId === "string" && b.taskId.trim() && b.taskId !== "null"
            ? b.taskId.trim()
            : null;
        return {
          taskId: tid,
          title: String(b.title || ""),
          startTime: String(b.startTime || ""),
          endTime: String(b.endTime || ""),
          category: String(b.category || "General"),
          reason: typeof b.reason === "string" ? b.reason : undefined,
        };
      });

      const blocks = validateProposedBlocks(
        rawBlocks,
        input.tasks,
        input.focusStart,
        input.focusEnd
      );

      if (blocks.length === 0) {
        lastError = "Gemini returned no valid blocks";
        continue;
      }

      const suggestion =
        typeof args.suggestion === "string" && args.suggestion.trim()
          ? args.suggestion.trim().slice(0, 400)
          : `AI planned ${blocks.length} blocks for your focus window.`;

      console.log(`[llm-plan] Gemini model=${model} blocks=${blocks.length}`);
      return { proposal: { blocks, suggestion } };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[llm-plan] ${model} failed:`, lastError);
    }
  }

  return { proposal: null, error: lastError };
}
