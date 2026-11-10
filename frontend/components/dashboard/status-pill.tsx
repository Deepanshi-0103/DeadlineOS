import { OpportunityStatus } from "@/lib/types";

const styles: Record<string, string> = {
  Urgent:          "bg-critical/10 text-critical border-critical/20 font-semibold",
  "In Progress":   "bg-brand/10 text-brand border-brand/15 font-medium",
  Saved:           "bg-surface-raised text-ink-muted border-line",
  Submitted:       "bg-accent/10 text-accent border-accent/20 font-semibold",
  "Under Review":  "bg-warning/10 text-warning border-warning/20 font-medium",
  "Needs Review":  "bg-warning/10 text-warning border-warning/25 font-semibold",
  "Not Started":   "bg-surface-raised text-ink-faint border-line",
  Completed:       "bg-safe/10 text-safe border-safe/20 font-semibold",
};

export function StatusPill({ status }: { status: OpportunityStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${styles[status] ?? styles.Saved}`}>
      {status}
    </span>
  );
}
