"use client";

import { useEffect, useState } from "react";
import { RewardsPanel } from "@/components/rewards/rewards-panel";

export default function InsightsPage() {
  const [data, setData] = useState<{
    week: {
      tasksCompleted: number;
      tasksOpen: number;
      completionRate: number;
      goalsActive: number;
      urgentOpportunities: number;
      smartAlerts: number;
      dismissedSuggestions: number;
      reschedules: number;
    };
    discovery: { topCategories: { name: string; count: number }[] };
    focusTip: string;
  } | null>(null);
  const [treatToast, setTreatToast] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then(setData)
      .catch(() => null);
  }, []);

  const w = data?.week;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold font-display text-ink mb-1">Insights</h1>
      <p className="text-sm text-ink-muted mb-6">
        Productivity signals plus your ice-cream reward loop — stay motivated, stay honest.
      </p>

      {treatToast && (
        <div className="lilac-wash rounded-3xl border border-brand/20 p-5 mb-5 text-sm text-ink animate-fade-up">
          {treatToast}
        </div>
      )}

      <div className="mb-8">
        <RewardsPanel onGesture={(g) => setTreatToast(g)} />
      </div>

      {data?.focusTip && (
        <div className="lilac-wash rounded-3xl border border-brand/15 p-5 mb-6 text-sm text-ink">
          {data.focusTip}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {[
          { label: "Completed (7d)", value: w?.tasksCompleted ?? "—" },
          { label: "Open tasks", value: w?.tasksOpen ?? "—" },
          { label: "Completion rate", value: w ? `${w.completionRate}%` : "—" },
          { label: "Active goals", value: w?.goalsActive ?? "—" },
          { label: "Urgent ops", value: w?.urgentOpportunities ?? "—", alert: true },
          { label: "Smart alerts", value: w?.smartAlerts ?? "—" },
          { label: "Dismissed AI tips", value: w?.dismissedSuggestions ?? "—" },
          { label: "Reschedules", value: w?.reschedules ?? "—" },
        ].map((c) => (
          <div key={c.label} className="soft-card p-4">
            <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider">
              {c.label}
            </p>
            <p
              className={`text-2xl font-bold font-display mt-1 ${
                c.alert && Number(c.value) > 0 ? "text-critical" : "text-ink"
              }`}
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <section className="soft-card p-5">
        <h2 className="text-sm font-bold font-display text-ink mb-3">Top opportunity categories</h2>
        <ul className="space-y-2">
          {(data?.discovery.topCategories || []).map((c) => (
            <li key={c.name} className="flex justify-between text-sm">
              <span className="text-ink-muted">{c.name}</span>
              <span className="font-semibold text-ink tabular-nums">{c.count}</span>
            </li>
          ))}
          {!data?.discovery.topCategories?.length && (
            <li className="text-xs text-ink-faint">Capture opportunities to see trends.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
