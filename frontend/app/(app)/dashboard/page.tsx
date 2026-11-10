"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useOpenMobileNav } from "@/components/layout/app-shell";
import { useAuth } from "@/components/layout/auth-provider";
import { TopBar } from "@/components/layout/topbar";
import { CapturePanel } from "@/components/capture/capture-panel";
import { StatsStrip } from "@/components/dashboard/stats-strip";
import { FilterTabs } from "@/components/dashboard/filter-tabs";
import { OpportunityGrid } from "@/components/dashboard/opportunity-grid";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EditOpportunityPanel } from "@/components/dashboard/edit-opportunity-panel";
import { Opportunity, OpportunityStatus, StatsData } from "@/lib/types";
import {
  matchesStatusTab,
  parseDashboardView,
  viewLabel,
  viewSubtitle,
  type DashboardView,
} from "@/lib/dashboard-nav";

const EMPTY_STATS: StatsData = { total: 0, urgent: 0, submitted: 0, saved: 0 };

const STATUS_TABS: (OpportunityStatus | "All")[] = [
  "All",
  "Urgent",
  "Needs Review",
  "Saved",
  "Submitted",
  "Under Review",
  "In Progress",
  "Completed",
];

function DashboardInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openMobileNav = useOpenMobileNav();

  const view = parseDashboardView(searchParams.get("view"));

  const [filter, setFilter] = useState<OpportunityStatus | "All">("All");
  const [query, setQuery] = useState("");

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<StatsData>(EMPTY_STATS);
  const [loadingOps, setLoadingOps] = useState(false);
  const [opsError, setOpsError] = useState<string | null>(null);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pendingOpp = opportunities.find((o) => o.id === pendingDeleteId);
  const [editOpp, setEditOpp] = useState<Opportunity | null>(null);

  // Sync status tab when URL changes (sidebar / stats)
  useEffect(() => {
    const s = searchParams.get("status");
    if (s && STATUS_TABS.includes(s as OpportunityStatus | "All")) {
      setFilter(s as OpportunityStatus);
    } else {
      setFilter("All");
    }
  }, [searchParams]);

  const setView = useCallback(
    (next: DashboardView, status?: OpportunityStatus | "All") => {
      const params = new URLSearchParams();
      if (next !== "all") params.set("view", next);
      if (status && status !== "All") params.set("status", status);
      const qs = params.toString();
      router.push(qs ? `/dashboard?${qs}` : "/dashboard");
    },
    [router]
  );

  const refreshOpportunities = useCallback(async () => {
    setLoadingOps(true);
    setOpsError(null);
    try {
      const res = await fetch("/api/opportunities");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load opportunities");
      setOpportunities(data.opportunities ?? []);
      setStats(data.stats ?? EMPTY_STATS);
    } catch (err: unknown) {
      setOpsError(err instanceof Error ? err.message : "Failed to load opportunities");
    } finally {
      setLoadingOps(false);
    }
  }, []);

  useEffect(() => {
    refreshOpportunities();
  }, [refreshOpportunities]);

  const filtered = useMemo(() => {
    return opportunities
      .filter((o) => {
        const matchesViewAndTab = matchesStatusTab(o, filter, view);
        const q = query.toLowerCase();
        const matchesQuery =
          !q ||
          o.title.toLowerCase().includes(q) ||
          o.organizer.toLowerCase().includes(q) ||
          o.category.toLowerCase().includes(q);
        return matchesViewAndTab && matchesQuery;
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [opportunities, filter, query, view]);

  const tabCounts = useMemo(() => {
    const counts: Partial<Record<OpportunityStatus | "All", number>> = {
      All: opportunities.filter((o) => matchesStatusTab(o, "All", view)).length,
    };
    for (const tab of STATUS_TABS) {
      if (tab === "All") continue;
      counts[tab] = opportunities.filter((o) => matchesStatusTab(o, tab, view)).length;
    }
    return counts;
  }, [opportunities, view]);

  const handleFilterChange = (tab: OpportunityStatus | "All") => {
    setFilter(tab);
    // Keep current view; refine with status param
    const params = new URLSearchParams();
    if (view !== "all") params.set("view", view);
    if (tab !== "All") params.set("status", tab);
    const qs = params.toString();
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard");
  };

  const handleStatSelect = (next: DashboardView | "submitted") => {
    if (next === "submitted") {
      setFilter("Submitted");
      router.push("/dashboard?status=Submitted");
      return;
    }
    setFilter("All");
    setView(next);
  };

  const handleDeleteConfirmed = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/opportunities/${pendingDeleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setPendingDeleteId(null);
      await refreshOpportunities();
    } catch (err: unknown) {
      setOpsError(err instanceof Error ? err.message : "Delete failed");
      setPendingDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const showCapture = view === "all" || view === "opportunities";
  const bannerEyebrow =
    view === "urgent"
      ? "Urgent queue"
      : view === "saved"
        ? "Saved inbox"
        : view === "opportunities"
          ? "All opportunities"
          : "Opportunity inbox";

  if (!user) return null;

  return (
    <>
      <TopBar
        query={query}
        onQueryChange={setQuery}
        onOpenMobileNav={openMobileNav}
        userName={user.name}
      />

        <div className="mb-5 rounded-3xl border border-brand/15 lilac-wash relative overflow-hidden animate-fade-up">
          <div className="relative z-10 flex items-start justify-between gap-3 min-h-[88px] sm:min-h-[100px]">
            <div className="min-w-0 pl-5 sm:pl-6 pt-4 sm:pt-5 pb-4 pr-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-brand">
                {bannerEyebrow}
              </span>
              <h1 className="mt-1 text-xl sm:text-2xl lg:text-[1.65rem] font-bold font-display text-ink tracking-tight leading-snug">
                {view === "all"
                  ? `Welcome back, ${user.name}`
                  : viewLabel(view)}
              </h1>
              <p className="text-xs sm:text-sm mt-1 text-ink-muted">
                {loadingOps ? "Syncing with Neon…" : viewSubtitle(view, filtered.length)}
              </p>
              {!loadingOps && opportunities.length === 0 && (
                <p className="text-[11px] text-ink-faint mt-1.5">
                  Capture a URL or paste text to add real opportunities — nothing is pre-seeded.
                </p>
              )}
              {view !== "all" && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Link
                    href="/home"
                    className="text-[11px] font-semibold text-brand hover:underline"
                  >
                    ← Home
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-[11px] font-medium text-ink-muted hover:text-ink"
                  >
                    Full inbox
                  </Link>
                </div>
              )}
            </div>

            <div className="hidden sm:block shrink-0 w-[120px] md:w-[150px] lg:w-[176px] h-[88px] sm:h-[100px] md:h-[112px] relative overflow-hidden self-stretch">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/deadline-hero.png"
                alt=""
                className="absolute right-0 bottom-0 w-[135%] max-w-none h-[130%] object-cover object-[62%_42%] select-none pointer-events-none opacity-90"
              />
            </div>
          </div>
        </div>

      {showCapture && <CapturePanel onCaptured={refreshOpportunities} />}

      {opsError && (
        <div className="mb-4 p-3.5 rounded-lg border border-critical/25 bg-critical-soft text-critical text-sm flex items-center justify-between gap-3">
          <span>{opsError}</span>
          <button
            type="button"
            onClick={() => setOpsError(null)}
            className="text-critical/60 hover:text-critical text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      <StatsStrip stats={stats} activeView={view} onSelectView={handleStatSelect} />
      <FilterTabs active={filter} onChange={handleFilterChange} counts={tabCounts} />

      {loadingOps && opportunities.length === 0 ? (
        <div className="py-16 text-center text-sm text-ink-muted">Loading opportunities…</div>
      ) : (
        <OpportunityGrid
          opportunities={filtered}
          view={view}
          statusTab={filter}
          onDelete={(id) => setPendingDeleteId(id)}
          onEdit={(opp) => setEditOpp(opp)}
        />
      )}

      <ConfirmDialog
        open={!!pendingDeleteId}
        title="Delete opportunity?"
        description={
          pendingOpp
            ? `"${pendingOpp.title}" will be permanently removed from your inbox and Neon.`
            : "This opportunity will be permanently removed."
        }
        confirmLabel="Yes, delete"
        loading={deleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setPendingDeleteId(null)}
      />

      <EditOpportunityPanel
        opportunity={editOpp}
        onClose={() => setEditOpp(null)}
        onSaved={(updated) => {
          setOpportunities((list) =>
            list.map((o) => (o.id === updated.id ? updated : o))
          );
          setEditOpp(null);
          refreshOpportunities();
        }}
      />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-ink-muted">Loading inbox…</div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
