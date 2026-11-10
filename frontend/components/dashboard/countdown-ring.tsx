function todayIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CountdownRing({
  daysLeft,
  deadline,
}: {
  daysLeft: number;
  deadline?: string | null;
}) {
  const unknown = !Number.isFinite(daysLeft) || daysLeft >= 9000 || !deadline;
  const expired =
    !unknown &&
    !!deadline &&
    /^\d{4}-\d{2}-\d{2}/.test(deadline) &&
    deadline.slice(0, 10) < todayIsoLocal();
  const safeDays = expired ? 0 : Math.max(0, daysLeft);
  const isCritical = !unknown && !expired && safeDays <= 3;
  const isWarning = !unknown && !expired && safeDays <= 7 && safeDays > 3;
  const strokeColor = unknown
    ? "#949AA6"
    : expired
      ? "#949AA6"
      : isCritical
        ? "#DC3D2F"
        : isWarning
          ? "#D97706"
          : "#1A9B6C";
  const textColor = unknown
    ? "text-ink-faint"
    : expired
      ? "text-ink-faint"
      : isCritical
        ? "text-critical"
        : isWarning
          ? "text-warning"
          : "text-safe";
  const progress = unknown || expired ? 0 : Math.max(0, 100 - (safeDays / 30) * 100);

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <path
            stroke="currentColor"
            className="text-line"
            strokeWidth="3"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            strokeDasharray={`${progress}, 100`}
            strokeWidth="3"
            stroke={strokeColor}
            strokeLinecap="round"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <span className={`absolute text-[10px] font-bold font-mono ${textColor}`}>
          {unknown ? "?" : expired ? "—" : `${safeDays}d`}
        </span>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[10px] text-ink-faint uppercase tracking-wider font-medium">Deadline</span>
        <span className={`text-xs font-semibold ${textColor}`}>
          {unknown
            ? "Not found"
            : expired
              ? "Expired"
              : safeDays === 0
                ? "Today!"
                : `${safeDays}d left`}
        </span>
      </div>
    </div>
  );
}
