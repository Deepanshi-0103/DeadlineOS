"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Link2, Unlink } from "lucide-react";

type Status = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  calendarId: string;
  connectedAt: string | null;
};

export function GoogleCalendarCard() {
  const search = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/google/status");
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const g = search.get("google");
    if (!g) return;
    const map: Record<string, string> = {
      connected: "Google Calendar connected. New tasks & accepted plans will sync out.",
      denied: "Google permission was denied.",
      error: "Could not connect Google Calendar. Try again.",
      not_configured: "Add GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to .env first.",
      invalid_state: "OAuth state expired. Click Connect again.",
    };
    setBanner(map[g] || null);
  }, [search]);

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch("/api/google/disconnect", { method: "POST" });
      await load();
      setBanner("Disconnected. Existing Google events are left as-is.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-sky/20 text-ink flex items-center justify-center">
          <CalendarDays size={16} />
        </div>
        <div>
          <h2 className="text-sm font-bold font-display text-ink">Google Calendar</h2>
          <p className="text-[11px] text-ink-faint">One-way sync: DeadlineOS → Google</p>
        </div>
      </div>

      <p className="text-xs text-ink-muted leading-relaxed mb-3">
        Push tasks with due dates and accepted Plan My Day blocks into Google Calendar so
        you get phone/email reminders. Google edits do not write back (yet).
      </p>

      {banner && (
        <p className="text-xs font-medium text-brand mb-3 bg-brand/5 border border-brand/15 rounded-xl px-3 py-2">
          {banner}
        </p>
      )}

      {!status?.configured && (
        <p className="text-[11px] text-ink-faint mb-3 font-mono bg-base border border-line-soft rounded-lg px-3 py-2">
          Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL in frontend/.env
        </p>
      )}

      {status?.connected ? (
        <div className="space-y-3">
          <p className="text-sm text-ink">
            Connected{status.email ? ` as ${status.email}` : ""} · calendar{" "}
            <span className="font-mono text-xs">{status.calendarId}</span>
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={disconnect}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-pill border border-line text-xs font-semibold text-ink-muted hover:text-critical"
          >
            <Unlink size={14} /> Disconnect
          </button>
        </div>
      ) : (
        <a
          href={status?.configured ? "/api/google/connect" : undefined}
          aria-disabled={!status?.configured}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-pill text-xs font-semibold ${
            status?.configured
              ? "bg-brand text-on-brand"
              : "bg-surface-raised text-ink-faint pointer-events-none"
          }`}
        >
          <Link2 size={14} /> Connect Google Calendar
        </a>
      )}
    </section>
  );
}
