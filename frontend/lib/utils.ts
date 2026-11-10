import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Urgency band drives ring color, numeral color, and priority styling. */
export function urgencyTone(daysLeft: number): "critical" | "warning" | "safe" {
  if (daysLeft <= 3) return "critical";
  if (daysLeft <= 10) return "warning";
  return "safe";
}
