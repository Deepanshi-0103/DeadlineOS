import { StatCard } from "./stat-card";
import { Target, AlertCircle, CheckCircle2, Bookmark } from "lucide-react";
import { StatsData } from "@/lib/types";
import type { DashboardView } from "@/lib/dashboard-nav";

interface StatsStripProps {
  stats: StatsData;
  activeView?: DashboardView;
  onSelectView?: (view: DashboardView | "submitted") => void;
}

export function StatsStrip({ stats, activeView, onSelectView }: StatsStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        label="Total Tracked"
        value={stats.total}
        subtext="All opportunities"
        icon={Target}
        variant="brand"
        delayMs={0}
        active={activeView === "all" || activeView === "opportunities"}
        onClick={onSelectView ? () => onSelectView("opportunities") : undefined}
      />
      <StatCard
        label="Urgent"
        value={stats.urgent}
        subtext="Due in ≤3 days"
        icon={AlertCircle}
        variant="warning"
        delayMs={60}
        active={activeView === "urgent"}
        onClick={onSelectView ? () => onSelectView("urgent") : undefined}
      />
      <StatCard
        label="Submitted"
        value={stats.submitted}
        subtext="Awaiting response"
        icon={CheckCircle2}
        variant="accent"
        delayMs={120}
        onClick={onSelectView ? () => onSelectView("submitted") : undefined}
      />
      <StatCard
        label="Saved"
        value={stats.saved}
        subtext="Inbox & review"
        icon={Bookmark}
        variant="neutral"
        delayMs={180}
        active={activeView === "saved"}
        onClick={onSelectView ? () => onSelectView("saved") : undefined}
      />
    </div>
  );
}
