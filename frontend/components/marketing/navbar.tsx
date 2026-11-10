"use client";

import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useState } from "react";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line-soft bg-surface/75 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo href="/" size="md" showWordmark={false} />
          <Link href="/" className="flex flex-col leading-none">
            <span className="font-display font-bold text-xl text-ink tracking-tight">
              Deadline<span className="text-brand">OS</span>
            </span>
            <span className="text-[9px] tracking-[0.2em] uppercase font-semibold text-ink-faint">
              Opportunity Inbox
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-muted">
          <Link href="#how-it-works" className="hover:text-brand transition-colors duration-200">
            How It Works
          </Link>
          <Link href="#features" className="hover:text-brand transition-colors duration-200">
            Features
          </Link>
          <Link href="#usecases" className="hover:text-brand transition-colors duration-200">
            Who It&apos;s For
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden sm:block text-sm font-medium text-ink-muted hover:text-brand px-3 py-2 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-sm font-semibold bg-brand hover:bg-brand-hover text-on-brand px-5 py-2.5 rounded-xl shadow-brand-sm hover:shadow-brand-md transition-all duration-200"
          >
            Get Started
            <ArrowRight size={15} />
          </Link>
          <button
            className="md:hidden p-2 text-ink-muted"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-line-soft bg-surface px-4 py-4 space-y-3">
          <Link href="#how-it-works" className="block text-sm font-medium text-ink-muted hover:text-brand py-1" onClick={() => setMenuOpen(false)}>How It Works</Link>
          <Link href="#features" className="block text-sm font-medium text-ink-muted hover:text-brand py-1" onClick={() => setMenuOpen(false)}>Features</Link>
          <Link href="#usecases" className="block text-sm font-medium text-ink-muted hover:text-brand py-1" onClick={() => setMenuOpen(false)}>Who It&apos;s For</Link>
          <Link href="/login" className="block text-sm font-medium text-ink-muted hover:text-brand py-1" onClick={() => setMenuOpen(false)}>Sign In</Link>
        </div>
      )}
    </header>
  );
}
