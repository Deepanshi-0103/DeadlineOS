"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Rule = {
  id: string;
  type: string;
  label: string;
  enabled: boolean;
  daysBefore: number;
};

type Alert = {
  id: string;
  kind: string;
  title: string;
  when: string;
  urgency: string;
  href?: string;
};

export default function AlertsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/alerts");
    if (res.ok) {
      const d = await res.json();
      setRules(d.rules || []);
      setAlerts(d.alerts || []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (rule: Rule) => {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
    });
    load();
  };

  const setDays = async (rule: Rule, daysBefore: number) => {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, daysBefore }),
    });
    load();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold font-display text-ink mb-1">Smart alerts</h1>
      <p className="text-sm text-ink-muted mb-6">
        Customizable · contest · mock test · deadline notifications.
      </p>

      <section className="soft-card p-5 mb-6 space-y-4">
        <h2 className="text-sm font-bold font-display text-ink">Alert preferences</h2>
        {rules.map((r) => (
          <div
            key={r.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-line-soft last:border-0"
          >
            <div>
              <p className="text-sm font-semibold text-ink">{r.label}</p>
              <p className="text-[11px] text-ink-faint capitalize">{r.type}</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[11px] text-ink-muted flex items-center gap-1.5">
                Days before
                <input
                  type="number"
                  min={0}
                  max={14}
                  value={r.daysBefore}
                  onChange={(e) => setDays(r, Number(e.target.value))}
                  className="w-14 px-2 py-1 rounded-lg border border-line bg-base text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => toggle(r)}
                className={`px-3 py-1.5 rounded-pill text-xs font-semibold ${
                  r.enabled
                    ? "bg-safe-soft text-safe"
                    : "bg-surface-raised text-ink-faint"
                }`}
              >
                {r.enabled ? "On" : "Off"}
              </button>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-sm font-bold font-display text-ink mb-3">Active notifications</h2>
        <div className="space-y-2">
          {alerts.map((a) => (
            <Link
              key={a.id}
              href={a.href || "#"}
              className={`soft-card p-4 flex items-start gap-3 hover:shadow-brand-sm transition-shadow ${
                a.urgency === "high" ? "border-rose/35" : ""
              }`}
            >
              <span
                className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                  a.urgency === "high"
                    ? "bg-critical"
                    : a.urgency === "medium"
                      ? "bg-accent"
                      : "bg-safe"
                }`}
              />
              <div>
                <p className="text-sm font-semibold text-ink">{a.title}</p>
                <p
                  className={`text-xs mt-0.5 ${
                    a.urgency === "high" ? "text-critical" : "text-ink-muted"
                  }`}
                >
                  {a.when} · {a.kind}
                </p>
              </div>
            </Link>
          ))}
          {alerts.length === 0 && (
            <div className="soft-card p-8 text-center text-sm text-ink-muted">
              No active alerts — enjoy the calm.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

