"use client";

import { useState } from "react";
import { ArrowRight, Link2, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface QuickInputProps {
  onCaptured?: () => void;
}

export function QuickInput({ onCaptured }: QuickInputProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setError(null);
    setDone(false);
    setNote(null);

    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "url", sourceUrl: url.trim() }),
      });
      const data = await res.json();

      if (!res.ok || data.job?.status === "failed") {
        throw new Error(data.error || data.job?.error || "Capture failed");
      }

      setDone(true);
      setUrl("");
      const opp = data.opportunity;
      const bits: string[] = [];
      if (data.deduped) {
        bits.push(`Updated existing “${opp?.title ?? "opportunity"}” (no duplicate).`);
      } else if (opp?.needsReview) {
        bits.push(`Saved “${opp.title}” — needs review.`);
      } else {
        bits.push(`Saved “${opp?.title ?? "opportunity"}” with extracted details.`);
      }
      if (data.llmError) {
        bits.push(`AI: ${data.llmError}.`);
      } else if (data.llmUsed) {
        bits.push("AI enrichment applied.");
      }
      if (data.thinContent) {
        bits.push("Page looked JS-rendered — use the Chrome extension for richer text.");
      }
      setNote(bits.join(" "));
      onCaptured?.();
      setTimeout(() => {
        setDone(false);
        setNote(null);
      }, 9000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/internship-or-hackathon..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-base border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgba(227,84,47,0.10)] transition-all"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || done}
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-on-brand px-5 py-3 rounded-xl text-sm font-semibold transition-all shrink-0 disabled:opacity-60 shadow-brand-sm hover:shadow-brand-md hover:scale-[1.02] active:scale-[0.98]"
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
              Capture
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
      {note && (
        <p className="text-xs text-brand mt-2 font-medium flex items-start gap-1.5">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          {note}
        </p>
      )}
      {error && (
        <p className="text-xs text-critical mt-2 font-medium flex items-start gap-1.5">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </form>
  );
}
