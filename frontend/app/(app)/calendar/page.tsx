"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

type DayEntry = {
  tasks: { id: string; title: string; category: string }[];
  deadlines: { id: string; title: string }[];
};

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<Record<string, DayEntry>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Custom");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/plan?mode=calendar&year=${year}&month=${month}`);
    if (res.ok) {
      const d = await res.json();
      setDays(d.days || {});
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const grid = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const label = new Date(year, month - 1, 1).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  const prev = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const next = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  const openDay = (d: number) => {
    const key = `${year}-${pad(month)}-${pad(d)}`;
    setSelected(key);
    setTitle("");
    setCategory("Custom");
    setError(null);
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Store as a task due that day so it appears on Calendar + Home todos
      const dueAt = `${selected}T12:00:00.000Z`;
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          dueAt,
          priority: "medium",
          durationMin: 60,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save event");
      setTitle("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const selectedEntry = selected ? days[selected] : null;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold font-display text-ink mb-1">Calendar</h1>
      <p className="text-sm text-ink-muted mb-6">
        Click any date to add an event. Events are saved as tasks with that due date.
      </p>

      <div className="soft-card p-5">
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={prev} className="p-2 rounded-full hover:bg-surface-hover">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-base font-bold font-display text-ink">{label}</h2>
          <button type="button" onClick={next} className="p-2 rounded-full hover:bg-surface-hover">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-ink-faint py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {grid.map((d, i) => {
            if (!d) return <div key={`e-${i}`} className="min-h-[72px]" />;
            const key = `${year}-${pad(month)}-${pad(d)}`;
            const entry = days[key];
            const hasDeadline = !!entry?.deadlines?.length;
            const hasTask = !!entry?.tasks?.length;
            const isSelected = selected === key;
            return (
              <button
                type="button"
                key={key}
                onClick={() => openDay(d)}
                className={`min-h-[72px] rounded-2xl border p-1.5 text-left transition-all hover:border-brand/40 hover:shadow-soft ${
                  isSelected
                    ? "border-brand ring-2 ring-brand/20 bg-brand-soft/50"
                    : hasDeadline
                      ? "border-rose/40 bg-critical-soft/50"
                      : hasTask
                        ? "border-brand/25 bg-brand-soft/40"
                        : "border-line-soft bg-base/50"
                }`}
              >
                <p className="text-[11px] font-bold text-ink px-1">{d}</p>
                <div className="mt-0.5 space-y-0.5">
                  {entry?.deadlines?.slice(0, 1).map((x) => (
                    <p key={x.id} className="text-[11px] text-critical font-medium truncate px-0.5">
                      {x.title}
                    </p>
                  ))}
                  {entry?.tasks?.slice(0, 2).map((x) => (
                    <p key={x.id} className="text-[11px] text-ink-muted truncate px-0.5">
                      {x.title}
                    </p>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="soft-card p-5 mt-5 animate-fade-up">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold font-display text-ink">Events on {selected}</h3>
              <p className="text-[11px] text-ink-faint mt-0.5">Add a title to hold something on this day</p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="p-2 rounded-full text-ink-faint hover:bg-surface-hover"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <ul className="space-y-2 mb-4">
            {selectedEntry?.deadlines?.map((x) => (
              <li key={x.id} className="text-xs font-medium text-critical flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-critical mt-1.5 shrink-0" />
                Deadline · {x.title}
              </li>
            ))}
            {selectedEntry?.tasks?.map((x) => (
              <li key={x.id} className="text-xs text-ink flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                {x.title}
                <span className="text-ink-faint">· {x.category}</span>
              </li>
            ))}
            {!selectedEntry?.tasks?.length && !selectedEntry?.deadlines?.length && (
              <li className="text-xs text-ink-faint">Nothing scheduled yet.</li>
            )}
          </ul>

          <form onSubmit={addEvent} className="flex flex-col sm:flex-row gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title (e.g. Mock test, Club meeting)"
              className="flex-1 px-4 py-2.5 rounded-pill bg-base border border-line text-sm focus:outline-none focus:border-brand"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2.5 rounded-pill bg-base border border-line text-sm"
            >
              {["Custom", "Study", "Career", "Contest", "Mock", "Assignments"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-pill bg-brand text-on-brand text-sm font-semibold disabled:opacity-60"
            >
              <Plus size={15} />
              {saving ? "Saving…" : "Add event"}
            </button>
          </form>
          {error && <p className="text-xs text-critical mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
