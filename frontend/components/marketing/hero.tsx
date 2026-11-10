"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  BrainCircuit,
  Bell,
  Inbox,
  UploadCloud,
  Globe,
} from "lucide-react";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
      <AnimatedGridPattern
        numSquares={42}
        maxOpacity={0.16}
        duration={3.4}
        className="text-brand/[0.32] dark:text-brand/[0.26] [mask-image:radial-gradient(ellipse_at_center,white,transparent_72%)]"
      />

      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(227, 84, 47, 0.08), transparent 60%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand/20 bg-brand/5 text-brand text-xs font-semibold uppercase tracking-widest mb-8">
            <Inbox size={13} />
            AI-Powered Opportunity Inbox
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-bold font-display text-ink leading-[1.12] tracking-tight mb-6">
            Stop losing opportunities
            <br />
            to{" "}
            <span className="italic font-normal text-brand">missed deadlines.</span>
          </h1>

          <p className="text-base sm:text-lg text-ink-muted max-w-2xl mx-auto leading-relaxed mb-10">
            DeadlineOS is your AI-powered command center for internships, scholarships, jobs,
            hackathons, and every other opportunity worth chasing. Capture anything. Let AI handle
            the rest.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-brand hover:bg-brand-hover text-on-brand font-semibold px-8 py-3.5 rounded-xl shadow-brand-md hover:shadow-brand-lg hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 text-base glow-pulse"
            >
              Start for Free
              <ArrowRight size={18} />
            </Link>
            <Link
              href="#how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-surface/80 border border-line hover:bg-surface-hover text-ink font-medium px-8 py-3.5 rounded-xl transition-all text-base backdrop-blur-sm"
            >
              See How It Works
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: Globe, label: "Browser Extension" },
              { icon: UploadCloud, label: "PDF & Docs" },
              { icon: BrainCircuit, label: "AI Extraction" },
              { icon: Bell, label: "Smart Reminders" },
              { icon: Calendar, label: "Calendar Sync" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface/80 border border-line text-xs font-medium text-ink-muted shadow-soft backdrop-blur-sm"
              >
                <Icon size={13} className="text-brand" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
