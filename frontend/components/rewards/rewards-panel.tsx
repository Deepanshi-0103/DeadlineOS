"use client";

import { useCallback, useEffect, useState } from "react";
import { IceCream, Sparkles, Trophy } from "lucide-react";
import {
  ICE_CREAM_COST,
  ICE_CREAMS_FOR_TREAT,
  POINTS_PER_TASK,
  REWARDS_CHANGED_EVENT,
} from "@/lib/rewards-constants";

export type RewardsState = {
  points: number;
  iceCreams: number;
  treatsClaimed: number;
  pointsPerTask: number;
  iceCreamCost: number;
  iceCreamsForTreat: number;
  canBuyIceCream: boolean;
  canClaimTreat: boolean;
  completedGoalsReady: { id: string; title: string }[];
  recent: { type: string; pointsDelta: number; at: string; note?: string }[];
  lastTreatGesture: string | null;
};

type Props = {
  compact?: boolean;
  onGesture?: (gesture: string) => void;
};

const PLACEHOLDER: RewardsState = {
  points: 0,
  iceCreams: 0,
  treatsClaimed: 0,
  pointsPerTask: POINTS_PER_TASK,
  iceCreamCost: ICE_CREAM_COST,
  iceCreamsForTreat: ICE_CREAMS_FOR_TREAT,
  canBuyIceCream: false,
  canClaimTreat: false,
  completedGoalsReady: [],
  recent: [],
  lastTreatGesture: null,
};

export function notifyRewardsChanged(extra?: { pointsDelta?: number }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(REWARDS_CHANGED_EVENT, { detail: extra || {} })
  );
}

export function RewardsPanel({ compact = false, onGesture }: Props) {
  const [rewards, setRewards] = useState<RewardsState>(PLACEHOLDER);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [gesture, setGesture] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/rewards", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      if (d.rewards) {
        setRewards(d.rewards);
        if (d.rewards.lastTreatGesture) setGesture(d.rewards.lastTreatGesture);
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live refresh when tasks complete elsewhere, or tab becomes visible
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ pointsDelta?: number }>).detail;
      if (detail?.pointsDelta) {
        setRewards((r) => {
          const points = r.points + detail.pointsDelta!;
          return {
            ...r,
            points,
            canBuyIceCream: points >= r.iceCreamCost,
          };
        });
        setFlash(`+${detail.pointsDelta} pts`);
        window.setTimeout(() => setFlash(null), 1800);
      }
      // Confirm with server (non-blocking)
      void load();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener(REWARDS_CHANGED_EVENT, onChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(REWARDS_CHANGED_EVENT, onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const act = async (action: string, extra?: { goalId?: string }) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(d.error || "Action failed");
        return;
      }
      if (d.rewards) setRewards(d.rewards);
      if (d.gesture) {
        setGesture(d.gesture);
        onGesture?.(d.gesture);
        setMsg(`Treat for “${d.goalTitle}” unlocked!`);
      } else if (action === "buy_icecream") {
        setMsg("Ice cream added 🍦");
      }
      notifyRewardsChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`soft-card p-5 space-y-4 ${!loaded ? "opacity-90" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold font-display text-ink flex items-center gap-1.5">
            <IceCream size={15} className="text-accent" />
            Treats & points
            {flash && (
              <span className="text-[11px] font-bold text-safe animate-fade-up">{flash}</span>
            )}
          </h3>
          {!compact && (
            <p className="text-[11px] text-ink-muted mt-1">
              Finish tasks → earn {rewards.pointsPerTask} pts → buy ice creams → claim a
              real-world treat when a goal is done.
            </p>
          )}
        </div>
        <Trophy size={16} className="text-brand shrink-0" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-base border border-line-soft p-3 text-center">
          <p className="text-[10px] font-semibold text-ink-faint uppercase">Points</p>
          <p className="text-xl font-bold font-display text-ink tabular-nums transition-all">
            {rewards.points}
          </p>
        </div>
        <div className="rounded-2xl bg-base border border-line-soft p-3 text-center">
          <p className="text-[10px] font-semibold text-ink-faint uppercase">Ice creams</p>
          <p className="text-xl font-bold font-display text-ink tabular-nums">
            {rewards.iceCreams}
          </p>
        </div>
        <div className="rounded-2xl bg-base border border-line-soft p-3 text-center">
          <p className="text-[10px] font-semibold text-ink-faint uppercase">Treats</p>
          <p className="text-xl font-bold font-display text-ink tabular-nums">
            {rewards.treatsClaimed}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !rewards.canBuyIceCream}
          onClick={() => act("buy_icecream")}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-pill bg-accent/80 text-ink text-xs font-semibold disabled:opacity-45"
        >
          <IceCream size={14} /> Buy ice cream (−{rewards.iceCreamCost} pts)
        </button>
        <button
          type="button"
          disabled={busy || !rewards.canClaimTreat}
          onClick={() =>
            act("claim_treat", {
              goalId: rewards.completedGoalsReady[0]?.id,
            })
          }
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-pill bg-brand text-on-brand text-xs font-semibold disabled:opacity-45"
        >
          <Sparkles size={14} /> Claim treat ({rewards.iceCreamsForTreat} 🍦)
        </button>
      </div>

      {msg && <p className="text-xs font-medium text-brand">{msg}</p>}

      {gesture && (
        <div className="lilac-wash rounded-2xl border border-brand/20 p-4 text-sm text-ink animate-fade-up">
          <p className="text-[11px] font-semibold text-brand mb-1">Your treat gesture</p>
          <p className="leading-relaxed">{gesture}</p>
        </div>
      )}

      {!compact && rewards.completedGoalsReady.length > 0 && (
        <p className="text-[11px] text-ink-faint">
          Ready goals: {rewards.completedGoalsReady.map((g) => g.title).join(", ")}
        </p>
      )}

      {!compact && rewards.recent.length > 0 && (
        <ul className="space-y-1.5 max-h-28 overflow-y-auto">
          {rewards.recent.slice(0, 6).map((e, i) => (
            <li key={`${e.at}-${i}`} className="text-[11px] text-ink-muted flex justify-between gap-2">
              <span className="truncate">{e.note || e.type}</span>
              <span className="tabular-nums shrink-0">
                {e.pointsDelta > 0 ? `+${e.pointsDelta}` : e.pointsDelta || "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
