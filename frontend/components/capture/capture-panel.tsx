"use client";

import { useState } from "react";
import { Link as LinkIcon, FileUp, Type, Sparkles, Puzzle } from "lucide-react";
import { QuickInput } from "./quick-input";
import { DropZone } from "./drop-zone";
import { TextCapture } from "./text-capture";

interface CapturePanelProps {
  onCaptured?: () => void;
}

type Tab = "quick" | "text" | "drop";

export function CapturePanel({ onCaptured }: CapturePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("quick");

  return (
    <div className="mb-8 p-6 sm:p-7 rounded-2xl bg-surface border border-line relative overflow-hidden glow-ring animate-fade-up">
      <div className="absolute -top-16 -right-12 w-48 h-48 rounded-full bg-brand/12 blur-3xl pointer-events-none orb-drift" />
      <div className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full bg-accent/10 blur-3xl pointer-events-none orb-drift-slow" />
      <div className="absolute top-0 left-0 right-0 h-0.5 accent-line" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-[#D4612A] flex items-center justify-center shadow-brand-sm glow-pulse">
            <Sparkles size={16} className="text-on-brand" />
          </div>
          <div>
            <h3 className="text-base font-bold font-display text-ink">Capture opportunity</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Link, text, PDF, or image — AI + heuristics extract deadlines into Neon
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-raised/80 border border-line-soft text-xs overflow-x-auto backdrop-blur-sm">
          {(
            [
              { id: "quick" as const, icon: LinkIcon, label: "Link" },
              { id: "text" as const, icon: Type, label: "Text" },
              { id: "drop" as const, icon: FileUp, label: "File" },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === id
                  ? "bg-surface text-brand font-semibold shadow-sm shadow-brand-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 animate-fade-in" key={activeTab}>
        {activeTab === "quick" && <QuickInput onCaptured={onCaptured} />}
        {activeTab === "text" && <TextCapture onCaptured={onCaptured} />}
        {activeTab === "drop" && <DropZone onCaptured={onCaptured} />}
      </div>

      {activeTab === "quick" && (
        <p className="relative z-10 mt-4 text-[11px] text-ink-faint flex items-start gap-1.5 leading-relaxed">
          <Puzzle size={12} className="mt-0.5 shrink-0 text-brand/70" />
          JS-heavy sites (Campulsy, many React apps): open the page and use the Chrome extension — server fetch only sees the HTML shell.
        </p>
      )}
    </div>
  );
}
