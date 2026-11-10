"use client";

import Link from "next/link";
import { Suspense } from "react";
import {
  User,
  Puzzle,
  Sparkles,
  Moon,
  Shield,
  ArrowLeft,
  ExternalLink,
  IceCream,
} from "lucide-react";
import { useOpenMobileNav } from "@/components/layout/app-shell";
import { useAuth } from "@/components/layout/auth-provider";
import { TopBar } from "@/components/layout/topbar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { RewardsPanel } from "@/components/rewards/rewards-panel";
import { GoogleCalendarCard } from "@/components/settings/google-calendar-card";

export default function SettingsPage() {
  const { user } = useAuth();
  const openMobileNav = useOpenMobileNav();

  if (!user) return null;

  return (
    <>
      <TopBar
        query=""
        onQueryChange={() => {}}
        onOpenMobileNav={openMobileNav}
        userName={user.name}
        hideSearch
      />

      <div className="mx-auto w-full max-w-xl px-1 sm:px-2">
        <div className="mb-8 text-center">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline mb-3"
          >
            <ArrowLeft size={13} /> Back to home
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-ink tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-ink-muted mt-1.5 max-w-md mx-auto">
            Account, appearance, rewards, and capture preferences — centered for a calm
            control panel.
          </p>
        </div>

        <div className="grid gap-5">
          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                <User size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold font-display text-ink">Profile</h2>
                <p className="text-[11px] text-ink-faint">Signed-in account</p>
              </div>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 py-2 border-b border-line-soft">
                <dt className="text-ink-muted">Name</dt>
                <dd className="font-semibold text-ink truncate">{user.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2 border-b border-line-soft">
                <dt className="text-ink-muted">Email</dt>
                <dd className="font-medium text-ink truncate">{user.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-ink-muted">User ID</dt>
                <dd className="font-mono text-[11px] text-ink-faint truncate max-w-[55%]">
                  {user.id}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                  <Moon size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold font-display text-ink">Appearance</h2>
                  <p className="text-[11px] text-ink-faint">Light / dark theme</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3 px-1">
              <IceCream size={15} className="text-accent" />
              <h2 className="text-sm font-bold font-display text-ink">Rewards</h2>
            </div>
            <RewardsPanel />
          </section>

          <Suspense fallback={null}>
            <GoogleCalendarCard />
          </Suspense>

          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold font-display text-ink">Capture & AI</h2>
                <p className="text-[11px] text-ink-faint">How DeadlineOS works</p>
              </div>
            </div>
            <ul className="space-y-2.5 text-xs text-ink-muted leading-relaxed text-left">
              <li className="flex gap-2">
                <span className="text-brand font-bold">•</span>
                Goals → tasks → Plan My Day → calendar (adaptive scheduling).
              </li>
              <li className="flex gap-2">
                <span className="text-brand font-bold">•</span>
                Complete tasks for points; buy ice creams; claim a treat when a goal is done.
              </li>
              <li className="flex gap-2">
                <span className="text-brand font-bold">•</span>
                Inbox captures links, PDFs, and images with AI into Neon.
              </li>
            </ul>
            <Link
              href="/insights"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
            >
              Open insights <ExternalLink size={12} />
            </Link>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-warning/12 text-warning flex items-center justify-center">
                <Puzzle size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold font-display text-ink">Chrome extension</h2>
                <p className="text-[11px] text-ink-faint">Best for Unstop & SPA pages</p>
              </div>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed mb-3">
              Open the opportunity page, then use the DeadlineOS extension so Gemini sees the
              rendered DOM — not just the HTML shell.
            </p>
            <p className="text-[11px] font-mono text-ink-faint bg-base border border-line-soft rounded-lg px-3 py-2">
              Default API base: http://localhost:3000
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-soft mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-safe/10 text-safe flex items-center justify-center">
                <Shield size={16} />
              </div>
              <h2 className="text-sm font-bold font-display text-ink">Data</h2>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Opportunities, tasks, and rewards are stored in your Neon database under your
              account. Signing out only clears the session cookie on this device.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
