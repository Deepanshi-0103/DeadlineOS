import { Opportunity } from "@/lib/types";
import { CountdownRing } from "./countdown-ring";
import { StatusPill } from "./status-pill";
import { PriorityTag } from "./priority-tag";
import { ExternalLink, Calendar, Award, Trash2, Pencil, AlertTriangle } from "lucide-react";

interface OpportunityCardProps {
  opportunity: Opportunity;
  onDelete?: (id: string) => void;
  onEdit?: (opp: Opportunity) => void;
}

function priorityGradient(priority: string) {
  if (priority === "Critical") return "from-critical/10 via-transparent to-transparent";
  if (priority === "High")     return "from-warning/10 via-transparent to-transparent";
  if (priority === "Medium")   return "from-brand/8 via-transparent to-transparent";
  return "from-safe/8 via-transparent to-transparent";
}

export function OpportunityCard({ opportunity, onDelete, onEdit }: OpportunityCardProps) {
  const needsReview = opportunity.needsReview;

  return (
    <div
      className={`relative p-5 border bg-surface transition-all duration-300 flex flex-col justify-between group rounded-xl overflow-hidden hover:shadow-brand-md hover:-translate-y-1 ${
        needsReview
          ? "border-warning/40 hover:border-warning/70"
          : "border-line hover:border-brand/40"
      }`}
    >
      {/* per-priority gradient blush */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${priorityGradient(opportunity.priority)} opacity-60 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
      />

      {/* left accent bar */}
      <div
        className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-gradient-to-b opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
          needsReview
            ? "from-warning/80 via-accent/50 to-transparent"
            : "from-brand/60 via-accent/40 to-transparent"
        }`}
      />

      {/* Needs Review ribbon */}
      {needsReview && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/15 border border-warning/30 text-[10px] font-semibold text-warning">
          <AlertTriangle size={9} />
          Review needed
        </div>
      )}

      <div className="relative z-10">
        <div className={`flex items-center gap-2 mb-4 ${needsReview ? "mt-5" : ""}`}>
          <PriorityTag priority={opportunity.priority} />
          {!needsReview && <StatusPill status={opportunity.status} />}
        </div>

        <h3 className={`text-base font-bold font-display transition-colors line-clamp-2 mb-1 ${
          needsReview
            ? "text-ink group-hover:text-warning"
            : "text-ink group-hover:text-brand"
        }`}>
          {opportunity.title}
        </h3>

        <p className="text-xs font-medium text-ink-muted mb-2">{opportunity.organizer}</p>

        {opportunity.summary ? (
          <p className="text-xs text-ink-faint leading-relaxed line-clamp-2 mb-4">
            {opportunity.summary}
          </p>
        ) : (
          <div className="mb-4" />
        )}

        <div className="flex flex-wrap items-center gap-3 py-3 border-y border-line-soft my-4 text-xs text-ink-muted">
          <div className="flex items-center gap-1.5 font-medium text-ink">
            <Award size={14} className="text-accent" />
            <span>{opportunity.reward || "No details"}</span>
          </div>
          <span className="text-line">•</span>
          <span className="px-2 py-0.5 rounded bg-surface-raised text-ink-muted text-[11px] font-mono">
            {opportunity.category}
          </span>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between pt-2">
        <CountdownRing daysLeft={opportunity.daysLeft} deadline={opportunity.deadline} />

        <div className="flex items-center gap-2">
          <div className="text-[11px] text-ink-faint hidden sm:flex items-center gap-1 font-mono">
            <Calendar size={12} />
            {opportunity.deadline || "Set deadline"}
          </div>

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(opportunity)}
              className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                needsReview
                  ? "text-warning bg-warning/10 hover:bg-warning hover:text-white"
                  : "text-ink-faint hover:text-brand hover:bg-brand/10"
              }`}
              title="Edit opportunity"
            >
              <Pencil size={14} />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(opportunity.id)}
              className="p-2 rounded-lg text-ink-faint hover:text-critical hover:bg-critical-soft transition-all duration-200 hover:scale-105"
              title="Delete opportunity"
            >
              <Trash2 size={15} />
            </button>
          )}

          <a
            href={opportunity.registrationUrl || opportunity.sourceUrl || opportunity.link || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-brand/8 text-brand hover:bg-brand hover:text-on-brand transition-all duration-200 hover:scale-105"
            title="Open link"
          >
            <ExternalLink size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}
