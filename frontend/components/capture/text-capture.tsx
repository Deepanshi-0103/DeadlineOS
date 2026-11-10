"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface TextCaptureProps {
  onCaptured?: () => void;
}

export function TextCapture({ onCaptured }: TextCaptureProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    setError(null);
    setDone(false);
    setNote(null);

    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", text: text.trim() }),
      });
      const data = await res.json();

      if (!res.ok || data.job?.status === "failed") {
        throw new Error(data.error || data.job?.error || "Capture failed");
      }

      setDone(true);
      setText("");
      const opp = data.opportunity;
      const bits: string[] = [];
      bits.push(
        opp?.needsReview
          ? `Saved “${opp.title}” — review the deadline if needed.`
          : `Extracted “${opp?.title ?? "opportunity"}” from your text.`
      );
      if (data.llmError) bits.push(`AI: ${data.llmError}.`);
      else if (data.llmUsed) bits.push("AI enrichment applied.");
      setNote(bits.join(" "));
      onCaptured?.();
      setTimeout(() => {
        setDone(false);
        setNote(null);
      }, 8000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        required
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Paste an email, announcement, or opportunity description. Include a deadline if you have one (e.g. Apply by March 15, 2026)."
        className="w-full px-4 py-3 rounded-xl bg-base border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand transition-colors resize-y min-h-[120px]"
        disabled={loading}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || done || !text.trim()}
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-on-brand px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Extracting…
            </>
          ) : done ? (
            <>
              <CheckCircle2 size={16} />
              Captured
            </>
          ) : (
            <>
              Extract & save
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
      {note && (
        <p className="text-xs text-brand font-medium flex items-start gap-1.5">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          {note}
        </p>
      )}
      {error && (
        <p className="text-xs text-critical font-medium flex items-start gap-1.5">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </form>
  );
}
