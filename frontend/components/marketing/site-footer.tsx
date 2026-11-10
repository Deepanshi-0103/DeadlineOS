import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export function SiteFooter() {
  return (
    <footer className="py-12 bg-base border-t border-line-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <BrandLogo href="/" size="sm" showWordmark />
            <span className="text-xs text-ink-faint">© 2026</span>
          </div>

          <nav className="flex items-center gap-6 text-xs text-ink-muted">
            <Link href="/login" className="hover:text-brand transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-brand transition-colors">Sign Up</Link>
            <Link href="#features" className="hover:text-brand transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-brand transition-colors">How It Works</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
