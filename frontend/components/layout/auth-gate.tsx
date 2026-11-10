"use client";

/**
 * Legacy helpers kept for category styling.
 * Auth + shell now live in AuthProvider / (app)/layout — do not wrap pages in AuthGate.
 */
export { useAuth, useAuthOptional, type AuthUser } from "@/components/layout/auth-provider";

export function categoryPillClass(category: string) {
  const c = category.toLowerCase();
  if (/study|learn/.test(c)) return "bg-sky/35 text-[#4A6FA5]";
  if (/assign|homework/.test(c)) return "bg-accent-soft text-[#C07850]";
  if (/cod|tech|hack/.test(c)) return "bg-mint/40 text-[#3D7A64]";
  if (/contest|competition/.test(c)) return "bg-lilac/50 text-[#6B5BB5]";
  if (/mock|test|exam/.test(c)) return "bg-critical-soft text-critical";
  return "bg-surface-raised text-ink-muted";
}
