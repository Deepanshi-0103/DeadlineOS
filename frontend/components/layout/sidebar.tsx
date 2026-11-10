"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  CalendarDays,
  Target,
  Compass,
  CheckSquare,
  Inbox,
  Bell,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  Plus,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

interface SidebarProps {
  userName?: string;
  userEmail?: string;
}

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/discover", label: "Explore", icon: Compass },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/plan", label: "Plan My Day", icon: Sparkles },
  { href: "/dashboard", label: "Inbox", icon: Inbox },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/settings", label: "Profile", icon: Settings },
];

export function Sidebar({ userName = "User", userEmail = "" }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const initial = userName ? userName.charAt(0).toUpperCase() : "U";

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="hidden lg:flex flex-col w-[248px] border-r border-line/80 bg-surface/90 backdrop-blur-sm p-5 shrink-0 min-h-screen sticky top-0">
      <div className="mb-6 px-1 flex items-center justify-between gap-2">
        <BrandLogo href="/home" size="sm" />
        <div className="w-9 h-9 rounded-full bg-lilac/40 text-brand flex items-center justify-center text-sm font-bold border border-brand/20">
          {initial}
        </div>
      </div>
      <p className="px-3 mb-4 text-[11px] text-ink-faint font-medium tracking-wide">
        Stay productive
      </p>

      <nav className="space-y-0.5 flex-1" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/home" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-pill text-sm transition-all ${
                active
                  ? "bg-lilac/45 text-ink font-semibold shadow-soft"
                  : "text-ink-muted hover:bg-surface-hover hover:text-ink font-medium"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={17} strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/plan"
        className="mt-3 mb-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-pill bg-lilac/50 hover:bg-lilac/70 text-ink text-sm font-semibold transition-colors border border-brand/15"
      >
        <Plus size={16} /> Quick Add
      </Link>

      <div className="pt-3 border-t border-line-soft space-y-2">
        <div className="px-1 min-w-0">
          <p className="text-xs font-semibold text-ink truncate">{userName}</p>
          <p className="text-[11px] text-ink-faint truncate">{userEmail || "Signed in"}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-pill text-xs font-semibold text-ink-muted border border-line hover:border-rose/40 hover:text-critical hover:bg-critical-soft transition-all"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}
