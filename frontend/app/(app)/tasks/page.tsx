"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { categoryPillClass } from "@/components/layout/auth-gate";
import { Check, ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";
import { notifyRewardsChanged } from "@/components/rewards/rewards-panel";

type Task = {
  id: string;
  title: string;
  notes: string | null;
  linkUrl: string | null;
  category: string;
  status: string;
  priority: string;
  dueAt: string | null;
  durationMin: number;
  goalId: string | null;
  goalTitle: string | null;
};

type Goal = { id: string; title: string };

const CATEGORIES = ["Study", "Assignments", "Coding", "Contest", "Mock", "Career", "Custom"];
const PRIORITIES = ["high", "medium", "low"];

const emptyForm = {
  title: "",
  notes: "",
  linkUrl: "",
  category: "Study",
  goalId: "",
  dueAt: "",
  priority: "medium",
  durationMin: 60,
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [creatingGoal, setCreatingGoal] = useState(false);

  const load = useCallback(async () => {
    const [t, g] = await Promise.all([fetch("/api/tasks"), fetch("/api/goals")]);
    if (t.ok) setTasks((await t.json()).tasks || []);
    if (g.ok) setGoals((await g.json()).goals || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createGoalInline = async (forEdit = false) => {
    const title = newGoalTitle.trim();
    if (!title) {
      setError("Enter a goal title to link.");
      return;
    }
    setCreatingGoal(true);
    setError(null);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category: "Career" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.goal?.id) {
        setError(d.error || "Could not create goal.");
        return;
      }
      const goal = d.goal as Goal;
      setGoals((prev) => [goal, ...prev.filter((g) => g.id !== goal.id)]);
      if (forEdit) setEditForm((f) => ({ ...f, goalId: goal.id }));
      else setForm((f) => ({ ...f, goalId: goal.id }));
      setNewGoalTitle("");
    } finally {
      setCreatingGoal(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setError("Enter a task title.");
      return;
    }
    const durationMin = Number(form.durationMin);
    if (!Number.isFinite(durationMin) || durationMin < 15) {
      setError("Duration must be at least 15 minutes.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        notes: form.notes.trim() || undefined,
        linkUrl: form.linkUrl.trim() || null,
        category: form.category,
        goalId: form.goalId || null,
        dueAt: form.dueAt || null,
        priority: form.priority,
        durationMin,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save task.");
      return;
    }
    setForm({ ...emptyForm, goalId: form.goalId });
    load();
  };

  const toggle = async (task: Task) => {
    const next = task.status === "done" ? "todo" : "done";
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      if (next === "done" && d.pointsAwarded) {
        notifyRewardsChanged({ pointsDelta: d.pointsAwarded });
      } else {
        notifyRewardsChanged();
      }
    }
    load();
  };

  const startEdit = (t: Task) => {
    setEditingId(t.id);
    setEditForm({
      title: t.title,
      notes: t.notes || "",
      linkUrl: t.linkUrl || "",
      category: t.category,
      goalId: t.goalId || "",
      dueAt: t.dueAt ? t.dueAt.slice(0, 10) : "",
      priority: t.priority,
      durationMin: t.durationMin,
    });
    setError(null);
  };

  const saveEdit = async (id: string) => {
    const title = editForm.title.trim();
    if (!title) {
      setError("Task title cannot be empty.");
      return;
    }
    const durationMin = Number(editForm.durationMin);
    if (!Number.isFinite(durationMin) || durationMin < 15) {
      setError("Duration must be at least 15 minutes.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        notes: editForm.notes.trim() || null,
        linkUrl: editForm.linkUrl.trim() || null,
        category: editForm.category,
        goalId: editForm.goalId || null,
        dueAt: editForm.dueAt || null,
        priority: editForm.priority,
        durationMin,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not update task.");
      return;
    }
    setEditingId(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (editingId === id) setEditingId(null);
    load();
  };

  const goalSelect = (
    value: string,
    onChange: (id: string) => void,
    forEdit = false
  ) => (
    <div className="sm:col-span-2 space-y-2">
      <label className="block text-[11px] font-semibold text-ink-muted">
        Link to goal
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-pill bg-base border border-line text-sm focus:outline-none focus:border-brand"
      >
        <option value="">No goal linked</option>
        {goals.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title}
          </option>
        ))}
      </select>
      {goals.length === 0 ? (
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <input
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            placeholder="Create a goal to link (e.g. Land internship)"
            className="flex-1 px-3 py-2 rounded-pill bg-base border border-line text-sm"
          />
          <button
            type="button"
            disabled={creatingGoal}
            onClick={() => createGoalInline(forEdit)}
            className="px-3 py-2 rounded-pill bg-lilac/50 text-xs font-semibold disabled:opacity-60"
          >
            {creatingGoal ? "Creating…" : "Create & link"}
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-ink-faint">
          Or{" "}
          <Link href="/goals" className="text-brand font-semibold hover:underline">
            manage goals
          </Link>
          . Pick one above to attach this task.
        </p>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold font-display text-ink mb-1">Tasks</h1>
      <p className="text-sm text-ink-muted mb-6">
        Link tasks to goals and optionally attach a URL. These feed Plan My Day.
      </p>

      <form onSubmit={add} className="soft-card p-4 mb-6 grid sm:grid-cols-2 gap-2">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Update resume"
          className="sm:col-span-2 px-4 py-2.5 rounded-pill bg-base border border-line text-sm"
        />
        <input
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="e.g. Tailor for product roles"
          className="sm:col-span-2 px-4 py-2.5 rounded-pill bg-base border border-line text-sm"
        />
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-ink-muted mb-1">
            Attach link (optional)
          </label>
          <input
            type="url"
            value={form.linkUrl}
            onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
            placeholder="https://… (doc, listing, form)"
            className="w-full px-4 py-2.5 rounded-pill bg-base border border-line text-sm"
          />
        </div>
        {goalSelect(form.goalId, (id) => setForm({ ...form, goalId: id }), false)}
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="px-3 py-2.5 rounded-pill bg-base border border-line text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          type="date"
          value={form.dueAt}
          onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
          className="px-3 py-2.5 rounded-pill bg-base border border-line text-sm"
        />
        <div className="flex gap-2 sm:col-span-2">
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="flex-1 px-3 py-2.5 rounded-pill bg-base border border-line text-sm"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p} priority
              </option>
            ))}
          </select>
          <input
            type="number"
            min={15}
            step={15}
            value={form.durationMin}
            onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
            title="Duration (minutes)"
            className="w-24 px-3 py-2.5 rounded-pill bg-base border border-line text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-pill bg-brand text-on-brand text-sm font-semibold disabled:opacity-60"
        >
          <Plus size={16} /> Add task
        </button>
        {error && !editingId && (
          <p className="sm:col-span-2 text-xs text-critical">{error}</p>
        )}
      </form>

      <div className="space-y-2">
        {tasks.map((t) => (
          <div
            key={t.id}
            className={`soft-card p-4 ${t.status === "done" ? "opacity-60" : ""}`}
          >
            {editingId === t.id ? (
              <div className="space-y-2">
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-base border border-line text-sm"
                />
                <input
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Notes"
                  className="w-full px-3 py-2 rounded-xl bg-base border border-line text-sm"
                />
                <input
                  type="url"
                  value={editForm.linkUrl}
                  onChange={(e) => setEditForm({ ...editForm, linkUrl: e.target.value })}
                  placeholder="https://… attach link"
                  className="w-full px-3 py-2 rounded-xl bg-base border border-line text-sm"
                />
                <div className="grid sm:grid-cols-2 gap-2">
                  {goalSelect(
                    editForm.goalId,
                    (id) => setEditForm({ ...editForm, goalId: id }),
                    true
                  )}
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-base border border-line text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={editForm.dueAt}
                    onChange={(e) => setEditForm({ ...editForm, dueAt: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-base border border-line text-sm"
                  />
                  <div className="flex gap-2 sm:col-span-2">
                    <select
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl bg-base border border-line text-sm"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={editForm.durationMin}
                      onChange={(e) =>
                        setEditForm({ ...editForm, durationMin: Number(e.target.value) })
                      }
                      className="w-20 px-2 py-2 rounded-xl bg-base border border-line text-sm"
                    />
                  </div>
                </div>
                {error && editingId === t.id && (
                  <p className="text-xs text-critical">{error}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveEdit(t.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-pill bg-brand text-on-brand text-xs font-semibold"
                  >
                    <Check size={14} /> Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-pill border border-line text-xs"
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggle(t)}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                    t.status === "done"
                      ? "bg-safe border-safe text-white"
                      : "border-line hover:border-brand"
                  }`}
                >
                  {t.status === "done" && <Check size={14} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      t.status === "done" ? "line-through text-ink-muted" : "text-ink"
                    }`}
                  >
                    {t.title}
                  </p>
                  <p className="text-[11px] text-ink-faint">
                    {t.goalTitle ? (
                      <span className="text-brand font-medium">{t.goalTitle} · </span>
                    ) : (
                      <span>No goal · </span>
                    )}
                    {t.dueAt ? t.dueAt.slice(0, 10) : "no due date"} · {t.durationMin}m ·{" "}
                    {t.priority}
                  </p>
                </div>
                {t.linkUrl && (
                  <a
                    href={t.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-ink-faint hover:text-brand"
                    title={t.linkUrl}
                    aria-label="Open link"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-pill font-semibold ${categoryPillClass(t.category)}`}
                >
                  {t.category}
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  className="p-2 text-ink-faint hover:text-ink"
                  aria-label="Edit task"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="p-2 text-ink-faint hover:text-critical"
                  aria-label="Delete task"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="soft-card p-10 text-center text-sm text-ink-muted">
            No tasks yet — add one above, then open Plan My Day → Generate.
          </div>
        )}
      </div>
    </div>
  );
}
