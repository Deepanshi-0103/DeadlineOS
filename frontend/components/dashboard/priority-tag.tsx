export function PriorityTag({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    HIGH:   "bg-critical text-white",
    MEDIUM: "bg-warning text-white",
    LOW:    "bg-brand/15 text-brand",
    High:   "bg-critical text-white",
    Medium: "bg-warning text-white",
    Low:    "bg-brand/15 text-brand",
  };

  const label: Record<string, string> = {
    HIGH: "High", MEDIUM: "Medium", LOW: "Low",
    High: "High", Medium: "Medium", Low: "Low",
  };

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${styles[priority] ?? "bg-surface-raised text-ink-muted"}`}>
      {label[priority] ?? priority}
    </span>
  );
}
