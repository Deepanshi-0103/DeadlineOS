import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FooterCta() {
  return (
    <section className="py-24 relative overflow-hidden bg-surface border-t border-line-soft">
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(227, 84, 47, 0.08), transparent 60%)",
        }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-ink tracking-tight mb-5">
          Your next big opportunity
          <br />
          is out there right now.
        </h2>
        <p className="text-base text-ink-muted max-w-xl mx-auto mb-10">
          Don&apos;t find out about it three days after the deadline closes.
          Create your free DeadlineOS inbox in 30 seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-brand hover:bg-brand-hover text-on-brand font-bold px-8 py-3.5 rounded-xl shadow-brand-md transition-all text-base"
          >
            Create Free Account
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-base border border-line hover:bg-surface-hover text-ink px-8 py-3.5 rounded-xl font-medium transition-all text-base"
          >
            Sign In
          </Link>
        </div>
      </div>
    </section>
  );
}
