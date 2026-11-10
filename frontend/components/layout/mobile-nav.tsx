"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  X,
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
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
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

export function MobileNav({ open, onClose, userName }: MobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  if (!open) return null;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    onClose();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-4/5 max-w-xs bg-surface border-r border-line p-6 flex flex-col justify-between h-full z-10 shadow-soft-lg animate-fade-in rounded-r-3xl">
        <div>
          <div className="flex items-center justify-between mb-6">
            <BrandLogo href="/home" size="sm" />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-ink-muted hover:bg-surface-hover"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
          <nav className="space-y-0.5" aria-label="Main">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/home" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-pill text-sm ${
                    active
                      ? "bg-lilac/45 text-ink font-semibold"
                      : "font-medium text-ink-muted hover:text-ink"
                  }`}
                >
                  <Icon size={17} /> {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="pt-4 border-t border-line-soft space-y-3">
          <p className="text-xs font-medium text-ink-faint px-1">
            Signed in as {userName || "User"}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-pill text-xs font-semibold text-on-brand bg-brand hover:bg-brand-hover"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
