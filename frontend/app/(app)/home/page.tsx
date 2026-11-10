"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Menu,
  Settings,
  Sparkles,
  Trophy,
  Wand2,
  CheckCircle2,
  ListTodo,
  Activity,
  Trash2,
} from "lucide-react";
import { categoryPillClass, useAuth } from "@/components/layout/auth-gate";
import { useOpenMobileNav } from "@/components/layout/app-shell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { QuotesCarousel } from "@/components/home/quotes-carousel";
import { RewardsPanel } from "@/components/rewards/rewards-panel";

type PlanBlock = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  status: string;
};

type Alert = {
  id: string;
  kind: string;
  title: string;
  when: string;
  urgency: string;
  href?: string;
};

type TodoItem = {
  id: string;
  title: string;
  category: string;
  status: string;
  dueAt: string | null;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { user } = useAuth();
  const openMobile = useOpenMobileNav();
  const [plan, setPlan] = useState<{
    date: string;
    suggestion: string | null;
    accepted: boolean;
    blocks: PlanBlock[];
  } | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [goalsDone, setGoalsDone] = useState({ done: 0, total: 5 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [planRes, alertRes, goalRes, taskRes] = await Promise.all([
      fetch("/api/plan"),
      fetch("/api/alerts"),
      fetch("/api/goals"),
      fetch("/api/tasks"),
    ]);
    let openTodos: TodoItem[] = [];
    if (taskRes.ok) {
      const d = await taskRes.json();
      openTodos = (d.tasks || []).filter(
        (t: TodoItem) =>
          (t.status === "todo" || t.status === "doing") &&
          !t.title.startsWith("[Example]")
      );
      setTodos(openTodos.slice(0, 6));
    }

    if (planRes.ok) {
      const d = await planRes.json();
      // Only auto-generate when the user has real open tasks
      if (!d.plan && openTodos.length > 0) {
        const gen = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate" }),
        });
        if (gen.ok) setPlan((await gen.json()).plan);
        else setPlan(null);
      } else {
        setPlan(d.plan);
      }
    }
    if (alertRes.ok) {
      const d = await alertRes.json();
      setAlerts((d.alerts || []).slice(0, 5));
    }
    if (goalRes.ok) {
      const d = await goalRes.json();
      const goals = (d.goals || []).filter(
        (g: { title: string }) => !g.title.startsWith("[Example]")
      );
      const active = goals.filter((g: { status: string }) => g.status === "active");
      const avg =
        active.length === 0
          ? 0
          : Math.round(
              active.reduce((s: number, g: { progress: number }) => s + g.progress, 0) /
                active.length
            );
      setGoalsDone({ done: Math.round((avg / 100) * 5), total: 5 });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  const planAction = async (action: string, extra?: { blockId?: string }) => {
    setBusy(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, date: plan?.date, ...extra }),
      });
      if (res.ok) {
        const d = await res.json();
        if (action === "clear" || action === "remove_block") {
          setPlan(d.plan);
        }
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const first = user.name.split(" ")[0] || user.name;
  const progressPct = Math.round((goalsDone.done / goalsDone.total) * 100);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Top utilities */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={openMobile}
          className="lg:hidden p-2.5 rounded-pill border border-line bg-surface text-ink-muted"
          aria-label="Menu"
        >
          <Menu size={16} />
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/alerts"
            className="p-2.5 rounded-full border border-line bg-surface text-ink-muted hover:text-critical hover:border-rose/40"
          >
            <Bell size={16} />
          </Link>
          <Link
            href="/settings"
            className="p-2.5 rounded-full border border-line bg-surface text-ink-muted hover:text-brand"
          >
            <Settings size={16} />
          </Link>
          <Link
            href="/plan"
            className="w-9 h-9 rounded-full bg-lilac/60 text-ink flex items-center justify-center hover:bg-lilac shadow-brand-sm"
          >
            <Sparkles size={16} />
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <div className="min-w-0 space-y-5">
          {/* Greeting + daily goals */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-up">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold font-display text-ink tracking-tight">
                {greeting()}, {first}
              </h1>
              <p className="text-sm text-ink-muted mt-1">
                Soft focus · plan your day · never miss a deadline
              </p>
            </div>
            <div className="soft-card px-4 py-3 min-w-[160px]">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider">
                  Daily goals
                </span>
                <Trophy size={14} className="text-accent" />
              </div>
              <p className="text-lg font-bold text-ink tabular-nums">
                {goalsDone.done}/{goalsDone.total}
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-surface-raised overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lilac to-accent transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* AI suggestion */}
          {plan?.suggestion && (
            <div className="lilac-wash rounded-3xl border border-brand/15 p-5 sm:p-6 animate-fade-up shadow-soft">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-surface/80 text-brand flex items-center justify-center shrink-0">
                  <Wand2 size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-brand mb-1">DeadlineOS suggests</p>
                  <p className="text-sm text-ink leading-relaxed">{plan.suggestion}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => planAction("accept")}
                      className="px-4 py-2 rounded-pill bg-brand text-on-brand text-xs font-semibold hover:bg-brand-hover disabled:opacity-60"
                    >
                      Schedule it
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => planAction("dismiss")}
                      className="px-4 py-2 rounded-pill border border-line bg-surface/70 text-ink-muted text-xs font-semibold hover:text-ink"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => planAction("reschedule")}
                      className="px-4 py-2 rounded-pill text-xs font-semibold text-brand hover:underline"
                    >
                      Reschedule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Things to do */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold font-display text-ink flex items-center gap-2">
                <ListTodo size={18} className="text-brand" />
                Things to do
              </h2>
              <Link href="/tasks" className="text-xs font-semibold text-brand hover:underline">
                All tasks
              </Link>
            </div>
            <div className="space-y-2">
              {todos.length === 0 ? (
                <div className="soft-card p-6 text-center text-sm text-ink-muted">
                  No open tasks — add some on Tasks or click a calendar date.
                </div>
              ) : (
                todos.map((t) => (
                  <div key={t.id} className="soft-card p-3.5 flex items-center gap-3">
                    <CheckCircle2
                      size={16}
                      className={t.status === "doing" ? "text-brand" : "text-line"}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{t.title}</p>
                      <p className="text-[11px] text-ink-faint">
                        {t.dueAt ? `Due ${t.dueAt.slice(0, 10)}` : "No due date"} · {t.status}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-pill text-[10px] font-semibold ${categoryPillClass(t.category)}`}
                    >
                      {t.category}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Today's plan */}
          <section>
            <div className="flex items-center justify-between mb-3 gap-2">
              <h2 className="text-lg font-bold font-display text-ink">Today&apos;s plan</h2>
              <div className="flex items-center gap-3">
                {(plan?.blocks?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => planAction("clear")}
                    className="text-xs font-semibold text-ink-faint hover:text-critical"
                  >
                    Clear all
                  </button>
                )}
                <Link href="/plan" className="text-xs font-semibold text-brand hover:underline">
                  Plan My Day
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              {(plan?.blocks || []).length === 0 ? (
                <div className="soft-card p-8 text-center">
                  <p className="text-sm text-ink-muted mb-3">
                    No blocks yet — add tasks, then generate a plan.
                  </p>
                  <button
                    type="button"
                    onClick={() => planAction("generate")}
                    className="px-4 py-2 rounded-pill bg-lilac/60 text-ink text-xs font-semibold"
                  >
                    Generate plan
                  </button>
                </div>
              ) : (
                plan!.blocks.map((b, i) => (
                  <div
                    key={b.id}
                    className="soft-card p-4 flex items-center gap-4 animate-fade-up"
                    style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
                  >
                    <div className="w-16 shrink-0 text-center">
                      <p className="text-xs font-bold text-ink tabular-nums">{b.startTime}</p>
                      <p className="text-[10px] text-ink-faint">{b.endTime}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{b.title}</p>
                      <p className="text-[11px] text-ink-faint mt-0.5">
                        {b.startTime} – {b.endTime}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-pill text-[10px] font-semibold ${categoryPillClass(b.category)}`}
                    >
                      {b.category}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => planAction("remove_block", { blockId: b.id })}
                      className="p-1.5 rounded-full text-ink-faint hover:text-critical"
                      aria-label="Remove from plan"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right column — quotes, rewards, updates + activity */}
        <aside className="space-y-5">
          <QuotesCarousel />
          <RewardsPanel compact />
          <div className="soft-card p-5">
            <h3 className="text-sm font-bold font-display text-ink mb-3 flex items-center gap-1.5">
              <Bell size={14} className="text-critical" />
              Updates
            </h3>
            <ul className="space-y-3">
              {alerts.length === 0 ? (
                <li className="text-xs text-ink-faint">No deadline alerts right now.</li>
              ) : (
                alerts.map((a) => (
                  <li key={a.id} className="flex gap-2.5 items-start">
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                        a.urgency === "high"
                          ? "bg-critical"
                          : a.urgency === "medium"
                            ? "bg-accent"
                            : "bg-safe"
                      }`}
                    />
                    <div className="min-w-0">
                      <Link
                        href={a.href || "/alerts"}
                        className="text-xs font-semibold text-ink hover:text-brand line-clamp-2"
                      >
                        {a.title}
                      </Link>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          a.urgency === "high" ? "text-critical font-medium" : "text-ink-faint"
                        }`}
                      >
                        {a.when} · {a.kind}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ul>
            <Link
              href="/alerts"
              className="mt-4 inline-block text-xs font-semibold text-brand hover:underline"
            >
              Alert settings
            </Link>
          </div>

          <div className="soft-card p-5">
            <h3 className="text-sm font-bold font-display text-ink mb-3 flex items-center gap-1.5">
              <Activity size={14} className="text-brand" />
              Activity log
            </h3>
            <ul className="space-y-2.5 text-xs text-ink-muted">
              {plan?.suggestion && (
                <li className="leading-relaxed">
                  <span className="font-semibold text-ink">Plan tip:</span> {plan.suggestion.slice(0, 120)}
                  {plan.suggestion.length > 120 ? "…" : ""}
                </li>
              )}
              {todos.slice(0, 3).map((t) => (
                <li key={`log-${t.id}`}>
                  Open task · <span className="text-ink font-medium">{t.title}</span>
                  {t.dueAt ? ` · due ${t.dueAt.slice(0, 10)}` : ""}
                </li>
              ))}
              {alerts.slice(0, 2).map((a) => (
                <li key={`log-a-${a.id}`}>
                  Alert · <span className="text-ink font-medium">{a.title}</span> ({a.when})
                </li>
              ))}
              {!plan?.suggestion && todos.length === 0 && alerts.length === 0 && (
                <li className="text-ink-faint">Nothing logged yet — capture or add a task.</li>
              )}
            </ul>
            <Link
              href="/calendar"
              className="mt-4 inline-block text-xs font-semibold text-brand hover:underline"
            >
              Open calendar
            </Link>
          </div>

          <div className="soft-card p-4 flex flex-col gap-2">
            <Link href="/discover" className="text-xs font-semibold text-ink hover:text-brand">
              Explore opportunities
            </Link>
            <Link href="/insights" className="text-xs font-semibold text-ink hover:text-brand">
              Productivity insights
            </Link>
            <Link href="/dashboard" className="text-xs font-semibold text-ink hover:text-brand">
              Opportunity inbox
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

