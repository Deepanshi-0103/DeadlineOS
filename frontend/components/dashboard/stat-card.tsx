import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  subtext: string;
  icon: LucideIcon;
  variant?: "brand" | "accent" | "warning" | "neutral";
  delayMs?: number;
  active?: boolean;
  onClick?: () => void;
}

const variantStyles = {
  brand: "bg-brand/8 text-brand border-brand/15",
  accent: "bg-accent/8 text-accent border-accent/15",
  warning: "bg-warning/8 text-warning border-warning/15",
  neutral: "bg-surface-raised text-ink-muted border-line",
};

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = "brand",
  delayMs = 0,
  active = false,
  onClick,
}: StatCardProps) {
  const interactive = typeof onClick === "function";
  const className = `relative p-5 border bg-surface rounded-xl overflow-hidden transition-all duration-300 flex items-center justify-between group animate-fade-up text-left w-full ${
    active
      ? "border-brand/50 shadow-brand-sm ring-2 ring-brand/15"
      : "border-line hover:border-brand/30 hover:shadow-brand-sm hover:-translate-y-0.5"
  } ${interactive ? "cursor-pointer" : ""}`;

  const body = (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-brand/4 via-transparent to-accent/4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative z-10">
        <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-widest">
          {label}
        </span>
        <div
          className="text-3xl font-bold font-display text-ink mt-1 animate-count-in"
          style={{ animationDelay: `${delayMs + 80}ms` }}
        >
          {value}
        </div>
        <span className="text-[11px] text-ink-faint mt-0.5 block">{subtext}</span>
      </div>
      <div
        className={`relative z-10 w-12 h-12 rounded-xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${variantStyles[variant]}`}
      >
        <Icon size={22} />
      </div>
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        style={{ animationDelay: `${delayMs}ms` }}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={className} style={{ animationDelay: `${delayMs}ms` }}>
      {body}
    </div>
  );
}
