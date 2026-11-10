"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2 rounded-lg border border-line text-ink-muted hover:text-brand hover:border-brand/30 hover:bg-brand/6 transition-all"
      aria-label="Toggle theme"
    >
      {isDark
        ? <Sun size={17} className="text-accent" />
        : <Moon size={17} className="text-brand" />}
    </button>
  );
}
