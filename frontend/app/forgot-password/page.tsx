"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { getRememberedEmail } from "@/lib/remember-email";

function ForgotPasswordForm() {
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = search.get("email");
    setEmail(fromQuery || getRememberedEmail());
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setDone(false);
    setResetUrl(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send reset link.");
      setDone(true);
      if (typeof data.resetUrl === "string" && data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell mode="forgot">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-ink">Forgot password</h2>
        <p className="text-sm text-ink-muted mt-1">
          Enter your account email and we&apos;ll send a recovery link.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-critical-soft border border-critical/25 text-critical text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {done && (
        <div className="mb-5 p-3.5 rounded-xl bg-safe/10 border border-safe/25 text-ink text-xs flex gap-2.5 animate-fade-in">
          <CheckCircle2 size={16} className="shrink-0 text-safe mt-0.5" />
          <div className="space-y-1.5 min-w-0">
            <p>
              If an account exists for that email, a password reset link has been
              prepared.
            </p>
            {resetUrl ? (
              <p className="text-ink-muted">
                Email delivery isn&apos;t configured yet — use this recovery link:{" "}
                <Link
                  href={resetUrl}
                  className="text-brand font-semibold break-all hover:underline"
                >
                  Reset password
                </Link>
              </p>
            ) : (
              <p className="text-ink-muted">
                Check your inbox (and spam). The link expires in 1 hour.
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            Email address
          </label>
          <div className="relative group">
            <Mail
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-brand transition-colors"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-base/70 border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgba(227,84,47,0.12)] transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-on-brand py-3 rounded-xl font-semibold text-sm shadow-brand-sm hover:shadow-brand-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:hover:scale-100"
        >
          {loading ? "Sending..." : "Send recovery link"}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
