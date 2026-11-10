"use client";

import { useCallback, useEffect, useState } from "react";
import { categoryPillClass } from "@/components/layout/auth-gate";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  color: string;
  targetDate: string | null;
  progress: number;
  status: string;
  taskCount: number;
};

const COLORS = ["lilac", "peach", "mint", "sky", "rose"];
const CATEGORIES = ["Career", "Study", "Contest", "Health", "Custom"];

function colorBar(c: string) {
  const map: Record<string, string> = {
    lilac: "bg-lilac",
    peach: "bg-accent",
    mint: "bg-mint",
    sky: "bg-sky",
    rose: "bg-rose",
  };
  return map[c] || "bg-lilac";
}

const emptyForm = {
  title: "",
  description: "",
  category: "Career",
  targetDate: "",
  progress: 0,
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/goals");
    if (res.ok) {
      const d = await res.json();
      setGoals(d.goals || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setError("Enter a goal title.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: form.description.trim() || undefined,
        category: form.category,
        color: COLORS[goals.length % COLORS.length],
        targetDate: form.targetDate || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save goal.");
      return;
    }
    setForm(emptyForm);
    load();
  };

  const startEdit = (g: Goal) => {
    setEditingId(g.id);
    setEditForm({
      title: g.title,
      description: g.description || "",
      category: g.category,
      targetDate: g.targetDate || "",
      progress: g.progress,
    });
    setError(null);
  };

  const saveEdit = async (id: string) => {
    const title = editForm.title.trim();
    if (!title) {
      setError("Goal title cannot be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: editForm.description.trim() || null,
        category: editForm.category,
        targetDate: editForm.targetDate || null,
        progress: Number(editForm.progress) || 0,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not update goal.");
      return;
    }
    setEditingId(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this goal? Linked tasks stay but lose the goal link.")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    if (editingId === id) setEditingId(null);
    load();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold font-display text-ink mb-1">Goals</h1>
      <p className="text-sm text-ink-muted mb-6">
        Set your own goals — they drive tasks and Plan My Day. Edit or delete anytime.
      </p>

      <form onSubmit={add} className="soft-card p-4 mb-6 space-y-2">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Land an internship"
          className="w-full px-4 py-2.5 rounded-pill bg-base border border-line text-sm focus:outline-none focus:border-brand"
        />
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="e.g. Apply to 5 roles this month"
          className="w-full px-4 py-2.5 rounded-pill bg-base border border-line text-sm focus:outline-none focus:border-brand"
        />
        <div className="flex flex-col sm:flex-row gap-2">
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
            value={form.targetDate}
            onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
            className="px-3 py-2.5 rounded-pill bg-base border border-line text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-pill bg-brand text-on-brand text-sm font-semibold disabled:opacity-60"
          >
            <Plus size={16} /> Add goal
          </button>
        </div>
        {error && !editingId && <p className="text-xs text-critical">{error}</p>}
      </form>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : goals.length === 0 ? (
        <div className="soft-card p-10 text-center text-sm text-ink-muted">
          No goals yet — add one above (or tap a format chip), then link tasks to it.
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <div key={g.id} className="soft-card p-5 relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${colorBar(g.color)}`} />
              {editingId === g.id ? (
                <div className="pl-2 space-y-2">
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-base border border-line text-sm"
                  />
                  <input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Description"
                    className="w-full px-3 py-2 rounded-xl bg-base border border-line text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
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
                      value={editForm.targetDate}
                      onChange={(e) => setEditForm({ ...editForm, targetDate: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-base border border-line text-sm"
                    />
                    <label className="flex items-center gap-2 text-xs text-ink-muted">
                      Progress
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editForm.progress}
                        onChange={(e) =>
                          setEditForm({ ...editForm, progress: Number(e.target.value) })
                        }
                        className="w-16 px-2 py-2 rounded-xl bg-base border border-line text-sm"
                      />
                      %
                    </label>
                  </div>
                  {error && editingId === g.id && (
                    <p className="text-xs text-critical">{error}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveEdit(g.id)}
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
                <div className="flex items-start justify-between gap-3 pl-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-ink">{g.title}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-pill font-semibold ${categoryPillClass(g.category)}`}
                      >
                        {g.category}
                      </span>
                    </div>
                    {g.description && (
                      <p className="text-xs text-ink-muted mb-2">{g.description}</p>
                    )}
                    <p className="text-[11px] text-ink-faint">
                      {g.taskCount} tasks · {g.progress}% · {g.targetDate || "no target date"}
                    </p>
                    <div className="mt-2 h-1.5 rounded-full bg-surface-raised max-w-xs overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colorBar(g.color)}`}
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(g)}
                      className="p-2 rounded-full text-ink-faint hover:text-ink hover:bg-surface-raised"
                      aria-label="Edit goal"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(g.id)}
                      className="p-2 rounded-full text-ink-faint hover:text-critical hover:bg-critical-soft"
                      aria-label="Delete goal"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
