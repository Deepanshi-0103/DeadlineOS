"use client";

import { Search, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface TopBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onOpenMobileNav: () => void;
  userName?: string;
  searchPlaceholder?: string;
  hideSearch?: boolean;
}

export function TopBar({
  query,
  onQueryChange,
  onOpenMobileNav,
  userName,
  searchPlaceholder = "Search opportunities, organizers, categories...",
  hideSearch = false,
}: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-4 mb-6 py-2">
      {hideSearch ? (
        <div className="flex-1" />
      ) : (
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgba(227,84,47,0.10)] transition-all"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {userName && (
          <div className="hidden sm:flex lg:hidden items-center gap-2 px-3 py-1.5 rounded-xl bg-brand/8 border border-brand/15 text-xs font-semibold text-brand">
            <div className="w-5 h-5 rounded-md bg-brand text-on-brand flex items-center justify-center text-[10px] font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="max-w-[80px] truncate">{userName}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-2.5 rounded-xl border border-line bg-surface text-ink-muted hover:text-ink"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
      </div>
    </header>
  );
}
