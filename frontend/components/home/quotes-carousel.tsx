"use client";

import { useEffect, useState } from "react";
import { Quote } from "lucide-react";

type QuoteItem = { text: string; author: string };

const FALLBACK: QuoteItem[] = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Anonymous" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
];

export function QuotesCarousel() {
  const [quotes, setQuotes] = useState<QuoteItem[]>(FALLBACK);
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Public quotes API (CORS-friendly) — DummyJSON
        const res = await fetch("https://dummyjson.com/quotes?limit=24");
        if (!res.ok) return;
        const data = await res.json();
        const list = (data.quotes || [])
          .map((q: { quote?: string; author?: string }) => ({
            text: (q.quote || "").trim(),
            author: (q.author || "Unknown").trim(),
          }))
          .filter((q: QuoteItem) => q.text.length > 10);
        if (!cancelled && list.length) setQuotes(list);
      } catch {
        // keep fallbacks
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (quotes.length < 2) return;
    const id = window.setInterval(() => {
      setFade(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % quotes.length);
        setFade(true);
      }, 220);
    }, 6500);
    return () => window.clearInterval(id);
  }, [quotes.length]);

  const q = quotes[index] || FALLBACK[0];

  return (
    <div className="soft-card p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold font-display text-ink flex items-center gap-1.5">
          <Quote size={14} className="text-brand" />
          Motivation
        </h3>
        <div className="flex gap-1">
          {quotes.slice(0, Math.min(quotes.length, 6)).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Quote ${i + 1}`}
              onClick={() => {
                setFade(false);
                setTimeout(() => {
                  setIndex(i % quotes.length);
                  setFade(true);
                }, 150);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === index % Math.min(quotes.length, 6)
                  ? "w-4 bg-brand"
                  : "w-1.5 bg-line hover:bg-ink-faint"
              }`}
            />
          ))}
        </div>
      </div>
      <div
        className={`transition-opacity duration-200 ${fade ? "opacity-100" : "opacity-0"}`}
      >
        <p className="text-sm text-ink leading-relaxed font-display italic">“{q.text}”</p>
        <p className="text-[11px] text-ink-faint mt-3 font-semibold">— {q.author}</p>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setFade(false);
            setTimeout(() => {
              setIndex((i) => (i - 1 + quotes.length) % quotes.length);
              setFade(true);
            }, 150);
          }}
          className="text-[11px] font-semibold text-ink-muted hover:text-ink px-2 py-1 rounded-pill border border-line"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => {
            setFade(false);
            setTimeout(() => {
              setIndex((i) => (i + 1) % quotes.length);
              setFade(true);
            }, 150);
          }}
          className="text-[11px] font-semibold text-ink-muted hover:text-ink px-2 py-1 rounded-pill border border-line"
        >
          Next
        </button>
      </div>
    </div>
  );
}
