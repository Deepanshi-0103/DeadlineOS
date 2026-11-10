"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { BrandLogo } from "@/components/brand/brand-logo";

interface AuthShellProps {
  children: React.ReactNode;
  mode: "login" | "signup";
}

export function AuthShell({ children, mode }: AuthShellProps) {
  return (
    <div className="relative min-h-screen w-full bg-base text-ink overflow-hidden">
      <AnimatedGridPattern
        numSquares={36}
        maxOpacity={0.18}
        duration={3.2}
        className="text-brand/[0.35] dark:text-brand/[0.28] [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]"
      />

      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[320px] rounded-full bg-brand/15 blur-3xl orb-drift"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-[280px] h-[280px] rounded-full bg-accent/10 blur-3xl orb-drift-slow"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 sm:px-8 py-5">
          <div className="flex items-center gap-3">
            <BrandLogo href="/" size="md" showWordmark={false} />
            <Link href="/" className="flex flex-col leading-none">
              <span className="font-display font-bold text-xl text-ink tracking-tight">
                Deadline<span className="text-brand">OS</span>
              </span>
              <span className="text-[9px] tracking-[0.18em] uppercase font-semibold text-ink-faint mt-0.5">
                Opportunity Inbox
              </span>
            </Link>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pb-12">
          <div className="w-full max-w-md animate-fade-up">
            <div className="glass-panel rounded-2xl border border-line shadow-soft p-7 sm:p-8 relative overflow-hidden glow-ring">
              <div className="absolute top-0 left-0 right-0 h-0.5 accent-line" />
              <div className="relative z-10">{children}</div>
            </div>

            <p className="mt-5 text-center text-xs text-ink-faint">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="text-brand font-semibold hover:underline">
                    Create one free
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link href="/login" className="text-brand font-semibold hover:underline">
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
