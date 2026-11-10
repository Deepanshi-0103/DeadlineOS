"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, Save, Loader2, AlertTriangle, CheckCircle2,
  Calendar, Building2, Tag, DollarSign, FileText, Users, ExternalLink,
} from "lucide-react";
import { Opportunity } from "@/lib/types";

interface EditOpportunityPanelProps {
  opportunity: Opportunity | null;
  onClose: () => void;
  onSaved: (updated: Opportunity) => void;
}

const CATEGORIES = [
  "Job", "Internship", "Hackathon", "Conference", "Workshop",
  "Scholarship", "Competition", "Fellowship", "Grant", "Event",
];

const STATUSES = [
  "Saved", "Urgent", "In Progress", "Submitted", "Under Review",
  "Completed", "Not Started", "Needs Review",
];

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
        <Icon size={12} className="text-brand" />
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 rounded-xl bg-base border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgba(227,84,47,0.10)] transition-all";

export function EditOpportunityPanel({
  opportunity,
  onClose,
  onSaved,
}: EditOpportunityPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    title: "",
    organizer: "",
    category: "Event",
    deadline: "",
    reward: "",
    status: "Saved",
    summary: "",
    eligibility: "",
    registrationUrl: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Populate form when opportunity changes
  useEffect(() => {
    if (!opportunity) return;
    setForm({
      title:           opportunity.title         || "",
      organizer:       opportunity.organizer     || "",
      category:        opportunity.category      || "Event",
      deadline:        opportunity.deadline      || "",
      reward:          opportunity.reward        || "",
      status:          opportunity.status        || "Saved",
      summary:         opportunity.summary       || "",
      eligibility:     opportunity.eligibility   || "",
      registrationUrl: opportunity.registrationUrl || opportunity.sourceUrl || "",
    });
    setError(null);
    setSaved(false);
  }, [opportunity]);

  // Close on Escape
  useEffect(() => {
    if (!opportunity) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [opportunity, onClose]);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!opportunity) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          needsReview: false, // saving manually clears the review flag
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setSaved(true);
      onSaved(data.opportunity);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!opportunity) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <aside
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-surface border-l border-line shadow-brand-lg flex flex-col animate-slide-in-right"
      >
        {/* Gradient top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-brand via-accent to-brand shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div>
            <h2 className="font-display font-bold text-base text-ink">Edit opportunity</h2>
            {opportunity.needsReview && (
              <div className="flex items-center gap-1 mt-0.5">
                <AlertTriangle size={11} className="text-warning" />
                <span className="text-[11px] text-warning font-medium">Needs review — heuristics couldn&apos;t find all fields</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Confidence badge */}
          {opportunity.confidence !== undefined && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
              opportunity.confidence >= 0.7
                ? "bg-safe-soft text-safe border border-safe/20"
                : opportunity.confidence >= 0.5
                ? "bg-warning-soft text-warning border border-warning/20"
                : "bg-critical-soft text-critical border border-critical/20"
            }`}>
              <div className="flex-1">
                Extraction confidence: {Math.round(opportunity.confidence * 100)}%
              </div>
              <div className="h-1.5 w-24 rounded-full bg-black/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(opportunity.confidence * 100)}%`,
                    background: opportunity.confidence >= 0.7
                      ? "#1A9B6C" : opportunity.confidence >= 0.5
                      ? "#D97706" : "#DC3D2F",
                  }}
                />
              </div>
            </div>
          )}

          <Field label="Title" icon={FileText}>
            <input
              type="text"
              value={form.title}
              onChange={set("title")}
              required
              className={inputCls}
              placeholder="Full opportunity name"
            />
          </Field>

          <Field label="Organizer" icon={Building2}>
            <input
              type="text"
              value={form.organizer}
              onChange={set("organizer")}
              className={inputCls}
              placeholder="Company / organisation"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" icon={Tag}>
              <select value={form.category} onChange={set("category")} className={inputCls}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field label="Status" icon={CheckCircle2}>
              <select value={form.status} onChange={set("status")} className={inputCls}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Deadline" icon={Calendar}>
              <input
                type="date"
                value={form.deadline}
                onChange={set("deadline")}
                className={inputCls}
              />
            </Field>

            <Field label="Reward / Prize" icon={DollarSign}>
              <input
                type="text"
                value={form.reward}
                onChange={set("reward")}
                className={inputCls}
                placeholder="$5,000 / stipend / -"
              />
            </Field>
          </div>

          <Field label="Summary" icon={FileText}>
            <textarea
              rows={3}
              value={form.summary}
              onChange={set("summary")}
              className={`${inputCls} resize-none`}
              placeholder="Brief description of the opportunity…"
            />
          </Field>

          <Field label="Eligibility" icon={Users}>
            <textarea
              rows={2}
              value={form.eligibility}
              onChange={set("eligibility")}
              className={`${inputCls} resize-none`}
              placeholder="Who can apply? (students, professionals, country, age…)"
            />
          </Field>

          <Field label="Apply / Register URL" icon={ExternalLink}>
            <input
              type="url"
              value={form.registrationUrl}
              onChange={set("registrationUrl")}
              className={inputCls}
              placeholder="https://…"
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-line shrink-0 space-y-2">
          {error && (
            <div className="p-2.5 rounded-lg bg-critical-soft border border-critical/20 text-critical text-xs flex items-center gap-2">
              <AlertTriangle size={13} />
              {error}
            </div>
          )}

          {saved && (
            <div className="p-2.5 rounded-lg bg-safe-soft border border-safe/20 text-safe text-xs flex items-center gap-2 animate-success-pop">
              <CheckCircle2 size={13} />
              Saved — Neon updated!
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-surface-hover transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="flex-1 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-on-brand text-sm font-semibold shadow-brand-sm hover:shadow-brand-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> Saving…</>
              ) : saved ? (
                <><CheckCircle2 size={14} /> Saved!</>
              ) : (
                <><Save size={14} /> Save changes</>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
