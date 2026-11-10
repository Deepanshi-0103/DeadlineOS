"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { getRememberedEmail, setRememberedEmail } from "@/lib/remember-email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(getRememberedEmail());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sign in failed.");
      }

      setRememberedEmail(email);
      router.push("/home");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell mode="login">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-ink">Welcome back</h2>
        <p className="text-sm text-ink-muted mt-1">
          Sign in to open your opportunity inbox
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-critical-soft border border-critical/25 text-critical text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            Email address
          </label>
          <div className="relative group">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-brand transition-colors" />
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

        <div>
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative group">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-brand transition-colors" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-base/70 border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgba(227,84,47,0.12)] transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-on-brand py-3 rounded-xl font-semibold text-sm shadow-brand-sm hover:shadow-brand-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:hover:scale-100"
        >
          {loading ? "Signing in..." : "Sign in"}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>
    </AuthShell>
  );
}
