import type { Opportunity, OpportunityStatus } from "./types";

/** Sidebar / deep-link views for the opportunity inbox */
export type DashboardView = "all" | "opportunities" | "urgent" | "saved";

export const DASHBOARD_VIEWS: DashboardView[] = [
  "all",
  "opportunities",
  "urgent",
  "saved",
];

export function parseDashboardView(raw: string | null | undefined): DashboardView {
  const v = (raw || "all").toLowerCase();
  if (v === "opportunities" || v === "urgent" || v === "saved" || v === "all") {
    return v;
  }
  // legacy ?filter=Urgent style
  if (v === "urgent" || raw === "Urgent") return "urgent";
  if (v === "saved" || raw === "Saved") return "saved";
  return "all";
}

export function viewToHref(view: DashboardView): string {
  if (view === "all") return "/dashboard";
  return `/dashboard?view=${view}`;
}

export function viewLabel(view: DashboardView): string {
  switch (view) {
    case "opportunities":
      return "All opportunities";
    case "urgent":
      return "Urgent deadlines";
    case "saved":
      return "Saved & needs review";
    default:
      return "Your inbox";
  }
}

export function viewSubtitle(view: DashboardView, count: number): string {
  switch (view) {
    case "urgent":
      return count
        ? `${count} due soon · act before they slip`
        : "Nothing urgent right now";
    case "saved":
      return count
        ? `${count} parked for later · including items needing review`
        : "No saved items yet";
    case "opportunities":
      return count
        ? `${count} opportunities · sorted by deadline`
        : "Capture a link, PDF, or image to get started";
    default:
      return count
        ? `${count} opportunities · sorted by deadline`
        : "Your opportunity inbox";
  }
}

/** Smart filters aligned with StatsStrip semantics */
export function matchesView(o: Opportunity, view: DashboardView): boolean {
  if (view === "all" || view === "opportunities") return true;

  if (view === "urgent") {
    if (o.status === "Completed") return false;
    if (o.status === "Urgent") return true;
    const known = Number.isFinite(o.daysLeft) && o.daysLeft < 9000;
    return known && o.daysLeft <= 3;
  }

  if (view === "saved") {
    return o.status === "Saved" || o.status === "Needs Review" || !!o.needsReview;
  }

  return true;
}

export function matchesStatusTab(
  o: Opportunity,
  tab: OpportunityStatus | "All",
  view: DashboardView
): boolean {
  if (!matchesView(o, view)) return false;
  if (tab === "All") return true;
  return o.status === tab;
}

export type NavItemId = "dashboard" | "opportunities" | "urgent" | "saved" | "settings";

export function activeNavId(
  pathname: string,
  view: DashboardView | null
): NavItemId {
  if (pathname.startsWith("/settings")) return "settings";
  if (!pathname.startsWith("/dashboard")) return "dashboard";
  if (view === "urgent") return "urgent";
  if (view === "saved") return "saved";
  if (view === "opportunities") return "opportunities";
  return "dashboard";
}
