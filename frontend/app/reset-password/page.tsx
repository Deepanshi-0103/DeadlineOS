"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

function ResetPasswordForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setToken(search.get("token") || "");
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not reset password.");
      setDone(true);
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell mode="reset">
        <div className="mb-4">
          <h2 className="text-2xl font-bold font-display text-ink">Invalid link</h2>
          <p className="text-sm text-ink-muted mt-1">
            This reset link is missing a token. Request a new one from the login page.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
        >
          Request a new recovery link <ArrowRight size={14} />
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell mode="reset">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-ink">Choose a new password</h2>
        <p className="text-sm text-ink-muted mt-1">
          Pick something memorable — at least 6 characters.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-critical-soft border border-critical/25 text-critical text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {done && (
        <div className="mb-5 p-3.5 rounded-xl bg-safe/10 border border-safe/25 text-ink text-xs flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 size={16} className="shrink-0 text-safe" />
          <span>Password updated. Redirecting to sign in…</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            New password
          </label>
          <div className="relative group">
            <Lock
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-brand transition-colors"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              disabled={done}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-base/70 border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgba(227,84,47,0.12)] transition-all disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            Confirm password
          </label>
          <div className="relative group">
            <Lock
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-brand transition-colors"
            />
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
              disabled={done}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-base/70 border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgba(227,84,47,0.12)] transition-all disabled:opacity-60"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || done}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-on-brand py-3 rounded-xl font-semibold text-sm shadow-brand-sm hover:shadow-brand-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:hover:scale-100"
        >
          {loading ? "Saving..." : done ? "Saved" : "Update password"}
          {!loading && !done && <ArrowRight size={16} />}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
