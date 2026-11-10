import { OpportunityStatus } from "@/lib/types";

interface FilterTabsProps {
  active: OpportunityStatus | "All";
  onChange: (s: OpportunityStatus | "All") => void;
  counts?: Partial<Record<OpportunityStatus | "All", number>>;
}

const options: (OpportunityStatus | "All")[] = [
  "All",
  "Urgent",
  "Needs Review",
  "Saved",
  "Submitted",
  "Under Review",
  "In Progress",
  "Completed",
];

export function FilterTabs({ active, onChange, counts }: FilterTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
      {options.map((tab) => {
        const isActive = active === tab;
        const isReview = tab === "Needs Review";
        const isUrgent = tab === "Urgent";
        const count = counts?.[tab];
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              isActive
                ? isReview
                  ? "bg-warning text-white shadow-sm"
                  : isUrgent
                    ? "bg-critical text-white shadow-sm"
                    : "bg-brand text-on-brand shadow-brand-sm"
                : isReview
                  ? "bg-warning/8 border border-warning/25 text-warning hover:bg-warning/15"
                  : "bg-surface border border-line text-ink-muted hover:text-brand hover:border-brand/30"
            }`}
          >
            {tab}
            {typeof count === "number" && (
              <span
                className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-md ${
                  isActive
                    ? "bg-white/20 text-inherit"
                    : "bg-surface-raised text-ink-faint"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
