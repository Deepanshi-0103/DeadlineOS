"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Opp = {
  id: string;
  title: string;
  category: string;
  organizer: string;
  deadline: string;
  daysLeft: number;
};

export default function DiscoverPage() {
  const [data, setData] = useState<{
    total: number;
    buckets: Record<string, Opp[]>;
    suggested: Opp[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/insights?type=discover")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const sections: { key: string; title: string; hint: string }[] = [
    { key: "contests", title: "Contests & hackathons", hint: "🏆" },
    { key: "internships", title: "Internships", hint: "💼" },
    { key: "scholarships", title: "Scholarships & grants", hint: "🎓" },
    { key: "jobs", title: "Jobs", hint: "🚀" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold font-display text-ink mb-1">Explore</h1>
      <p className="text-sm text-ink-muted mb-6">
        Contest, hackathon, internship & scholarship discovery from your captured inbox.
      </p>

      <div className="lilac-wash rounded-3xl border border-brand/15 p-5 mb-6">
        <p className="text-sm text-ink">
          Capture more via{" "}
          <Link href="/dashboard" className="font-semibold text-brand underline">
            Inbox
          </Link>{" "}
          (link, PDF, image) — discovery organizes them automatically.
        </p>
        <p className="text-xs text-ink-muted mt-1">
          {data ? `${data.total} opportunities in your library` : "Loading…"}
        </p>
      </div>

      {data?.suggested?.length ? (
        <section className="mb-8">
          <h2 className="text-sm font-bold font-display text-ink mb-3">Due within 2 weeks</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.suggested.map((o) => (
              <div key={o.id} className="soft-card p-4">
                <p className="text-sm font-semibold text-ink line-clamp-2">{o.title}</p>
                <p className="text-[11px] text-ink-faint mt-1">
                  {o.organizer} · {o.category}
                </p>
                <p
                  className={`text-xs mt-2 font-medium ${
                    o.daysLeft <= 3 ? "text-critical" : "text-ink-muted"
                  }`}
                >
                  {o.daysLeft <= 0
                    ? "Due today"
                    : `${o.daysLeft}d left · ${o.deadline || "—"}`}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {sections.map((s) => {
        const items = data?.buckets?.[s.key] || [];
        return (
          <section key={s.key} className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-ink mb-3">
              {s.hint} {s.title}
              <span className="text-base text-ink-faint font-medium ml-2">{items.length}</span>
            </h2>
            {items.length === 0 ? (
              <p className="text-xs text-ink-faint soft-card p-4">Nothing in this bucket yet.</p>
            ) : (
              <div className="space-y-2">
                {items.slice(0, 6).map((o) => (
                  <div key={o.id} className="soft-card p-3.5 flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{o.title}</p>
                      <p className="text-[11px] text-ink-faint">{o.organizer}</p>
                    </div>
                    <span className="text-[11px] text-ink-muted shrink-0 tabular-nums">
                      {o.deadline || "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

