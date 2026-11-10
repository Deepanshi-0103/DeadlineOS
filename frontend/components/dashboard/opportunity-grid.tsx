import { Opportunity } from "@/lib/types";
import { OpportunityCard } from "./opportunity-card";
import { Inbox, Clock, Bookmark, Sparkles } from "lucide-react";
import type { DashboardView } from "@/lib/dashboard-nav";
import Link from "next/link";

interface OpportunityGridProps {
  opportunities: Opportunity[];
  onDelete?: (id: string) => void;
  onEdit?: (opp: Opportunity) => void;
  view?: DashboardView;
  statusTab?: string;
}

function EmptyState({ view, statusTab }: { view?: DashboardView; statusTab?: string }) {
  if (statusTab && statusTab !== "All") {
    return (
      <div className="py-14 text-center rounded-2xl bg-surface border border-dashed border-line p-8">
        <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-4">
          <Inbox size={22} />
        </div>
        <h4 className="text-base font-semibold font-display text-ink">
          No “{statusTab}” items
        </h4>
        <p className="text-xs text-ink-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
          Nothing matches this status filter. Try another tab or capture a new opportunity.
        </p>
      </div>
    );
  }

  if (view === "urgent") {
    return (
      <div className="py-14 text-center rounded-2xl bg-surface border border-dashed border-warning/30 p-8">
        <div className="w-12 h-12 rounded-2xl bg-warning/12 text-warning flex items-center justify-center mx-auto mb-4">
          <Clock size={22} />
        </div>
        <h4 className="text-base font-semibold font-display text-ink">You&apos;re clear</h4>
        <p className="text-xs text-ink-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
          No deadlines in the next 3 days. Check{" "}
          <Link href="/dashboard?view=opportunities" className="text-brand underline">
            all opportunities
          </Link>{" "}
          or capture something new.
        </p>
      </div>
    );
  }

  if (view === "saved") {
    return (
      <div className="py-14 text-center rounded-2xl bg-surface border border-dashed border-line p-8">
        <div className="w-12 h-12 rounded-2xl bg-surface-raised text-ink-muted flex items-center justify-center mx-auto mb-4">
          <Bookmark size={22} />
        </div>
        <h4 className="text-base font-semibold font-display text-ink">Nothing saved yet</h4>
        <p className="text-xs text-ink-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
          Saved and Needs Review items show up here. Capture a link, PDF, or image to fill your
          board.
        </p>
      </div>
    );
  }

  return (
    <div className="py-16 text-center rounded-2xl bg-surface border border-dashed border-line p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand/4 via-transparent to-accent/4 pointer-events-none" />
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand/15 to-accent/15 text-brand flex items-center justify-center mx-auto mb-4 shadow-brand-sm">
          <Sparkles size={22} />
        </div>
        <h4 className="text-base font-semibold font-display text-ink">No opportunities yet</h4>
        <p className="text-xs text-ink-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
          Paste a URL, drop a PDF or image, or type text above to start capturing into your inbox.
        </p>
      </div>
    </div>
  );
}

export function OpportunityGrid({
  opportunities,
  onDelete,
  onEdit,
  view,
  statusTab,
}: OpportunityGridProps) {
  if (opportunities.length === 0) {
    return <EmptyState view={view} statusTab={statusTab} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {opportunities.map((op, i) => (
        <div key={op.id} className="animate-fade-up" style={{ animationDelay: `${i * 55}ms` }}>
          <OpportunityCard opportunity={op} onDelete={onDelete} onEdit={onEdit} />
        </div>
      ))}
    </div>
  );
}
