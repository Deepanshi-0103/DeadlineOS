"use client";

import { useCallback, useEffect, useState } from "react";
import { categoryPillClass } from "@/components/layout/auth-gate";
import {
  ArrowRightLeft,
  Check,
  Clock,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { notifyRewardsChanged } from "@/components/rewards/rewards-panel";
import { POINTS_PER_TASK } from "@/lib/rewards-constants";

type PlanBlock = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  status: string;
};

type Plan = {
  date: string;
  suggestion: string | null;
  accepted: boolean;
  blocks: PlanBlock[];
  source?: "gemini" | "rules";
};

export default function PlanPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [source, setSource] = useState<"gemini" | "rules" | null>(null);
  const [busy, setBusy] = useState(false);
  const [manageId, setManageId] = useState<string | null>(null);
  const [swapFromId, setSwapFromId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/plan");
    if (res.ok) {
      const d = await res.json();
      setPlan(d.plan);
      if (d.plan?.source) setSource(d.plan.source);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (
    action: string,
    extra?: { blockId?: string; otherBlockId?: string }
  ) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, date: plan?.date, ...extra }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Action failed");
        return;
      }
      setPlan(d.plan);
      if (d.source) setSource(d.source);
      else if (d.plan?.source) setSource(d.plan.source);
      if (action === "complete") {
        notifyRewardsChanged({ pointsDelta: POINTS_PER_TASK });
      }
      setManageId(null);
      setSwapFromId(null);
    } finally {
      setBusy(false);
    }
  };

  const activeBlocks = (plan?.blocks || []).filter((b) => b.status !== "skipped");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold font-display text-ink mb-1">Plan My Day</h1>
      <p className="text-sm text-ink-muted mb-2">
        Gemini schedules from your{" "}
        <a href="/tasks" className="font-semibold text-brand hover:underline">
          tasks
        </a>{" "}
        &{" "}
        <a href="/goals" className="font-semibold text-brand hover:underline">
          goals
        </a>
        ; rules engine is the fallback. Miss a slot → Drop, Swap, or Postpone.
      </p>
      {source && (
        <p className="text-[11px] text-ink-faint mb-5">
          Last generate: {source === "gemini" ? "Gemini (tool calling)" : "Rules engine"}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        <button
          type="button"
          disabled={busy}
          onClick={() => act("generate")}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-pill bg-brand text-on-brand text-sm font-semibold disabled:opacity-60"
        >
          <Sparkles size={15} /> {busy ? "Working…" : "Generate"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act("reschedule")}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-pill border border-line bg-surface text-sm font-semibold"
        >
          <RefreshCw size={15} /> Auto-reschedule
        </button>
        <button
          type="button"
          disabled={busy || plan?.accepted}
          onClick={() => act("accept")}
          className="px-4 py-2.5 rounded-pill bg-lilac/50 text-sm font-semibold disabled:opacity-50"
        >
          {plan?.accepted ? "Accepted" : "Accept & sync calendar"}
        </button>
        {(plan?.blocks?.length ?? 0) > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => act("clear")}
            className="px-4 py-2.5 rounded-pill border border-line text-sm font-semibold text-ink-muted hover:text-critical"
          >
            Clear plan
          </button>
        )}
      </div>

      {error && <p className="text-xs text-critical mb-3">{error}</p>}

      {plan?.suggestion && (
        <div className="lilac-wash rounded-3xl border border-brand/15 p-5 mb-5 text-sm text-ink">
          {plan.suggestion}
          <button
            type="button"
            onClick={() => act("dismiss")}
            className="ml-2 text-xs font-semibold text-ink-muted hover:text-ink underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {swapFromId && (
        <div className="soft-card p-4 mb-4 border border-brand/30">
          <p className="text-sm font-semibold text-ink mb-1">Swap with another block</p>
          <p className="text-xs text-ink-muted mb-3">
            Tap a block below to exchange work (times stay put).
          </p>
          <button
            type="button"
            onClick={() => setSwapFromId(null)}
            className="text-xs font-semibold text-ink-muted hover:text-ink"
          >
            Cancel swap
          </button>
        </div>
      )}

      <div className="space-y-3">
        {activeBlocks.map((b) => (
          <div key={b.id} className="soft-card p-4 relative">
            <div className="flex items-center gap-4">
              <div className="w-20 text-center shrink-0">
                <p className="text-sm font-bold tabular-nums text-ink">{b.startTime}</p>
                <p className="text-[10px] text-ink-faint">{b.endTime}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold truncate ${
                    b.status === "done" ? "line-through text-ink-muted" : "text-ink"
                  }`}
                >
                  {b.title}
                </p>
                {b.status === "moved" && (
                  <p className="text-[10px] text-brand font-medium">Postponed</p>
                )}
              </div>
              <span
                className={`text-[10px] px-2.5 py-1 rounded-pill font-semibold ${categoryPillClass(b.category)}`}
              >
                {b.category}
              </span>
              {swapFromId ? (
                <button
                  type="button"
                  disabled={busy || swapFromId === b.id}
                  onClick={() =>
                    act("swap", { blockId: swapFromId, otherBlockId: b.id })
                  }
                  className="px-3 py-1.5 rounded-pill bg-brand text-on-brand text-xs font-semibold disabled:opacity-40"
                >
                  Swap here
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy || b.status === "done"}
                    onClick={() => act("complete", { blockId: b.id })}
                    className="p-2 text-ink-faint hover:text-safe"
                    aria-label="Mark done"
                    title="Done"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setManageId(manageId === b.id ? null : b.id)}
                    className="p-2 text-ink-faint hover:text-ink"
                    aria-label="Missed / adjust"
                    title="Not done / adjust"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </>
              )}
            </div>

            {manageId === b.id && !swapFromId && (
              <div className="mt-3 pt-3 border-t border-line-soft grid sm:grid-cols-3 gap-2">
                <p className="sm:col-span-3 text-[11px] text-ink-muted mb-1">
                  Slot not finished? Choose one:
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act("drop", { blockId: b.id })}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-line text-xs font-semibold hover:border-critical hover:text-critical"
                >
                  <X size={14} /> Drop
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setSwapFromId(b.id);
                    setManageId(null);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-line text-xs font-semibold hover:border-brand hover:text-brand"
                >
                  <ArrowRightLeft size={14} /> Swap
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act("postpone", { blockId: b.id })}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-line text-xs font-semibold hover:border-brand hover:text-brand"
                >
                  <Clock size={14} /> Postpone
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act("remove_block", { blockId: b.id })}
                  className="sm:col-span-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] text-ink-faint hover:text-critical"
                >
                  <Trash2 size={12} /> Remove without shifting others
                </button>
              </div>
            )}
          </div>
        ))}
        {!activeBlocks.length && (
          <div className="soft-card p-10 text-center text-sm text-ink-muted space-y-2">
            <p>Nothing to schedule yet.</p>
            <p>
              Set a{" "}
              <a href="/goals" className="font-semibold text-brand hover:underline">
                goal
              </a>
              , add{" "}
              <a href="/tasks" className="font-semibold text-brand hover:underline">
                tasks
              </a>
              , then click Generate.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
