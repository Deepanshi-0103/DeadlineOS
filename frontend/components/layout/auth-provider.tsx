"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Lock, LogIn } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.authenticated && data.user ? data.user : null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, refresh, setUser }),
    [user, loading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

/** Optional hook when provider may be absent (e.g. marketing pages). */
export function useAuthOptional() {
  return useContext(AuthContext);
}

/**
 * Shared chrome for all authenticated routes.
 * Auth is fetched once; navigating between pages keeps the sidebar mounted.
 */
export function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-base flex flex-col items-center justify-center p-4">
        <div className="w-9 h-9 rounded-full border-2 border-line border-t-brand animate-spin mb-4" />
        <p className="text-sm text-ink-muted font-medium">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-base flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 border border-line bg-surface text-center rounded-3xl shadow-soft">
          <div className="w-11 h-11 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mx-auto mb-4">
            <Lock size={20} />
          </div>
          <h2 className="text-2xl font-bold font-display text-ink mb-2">Sign in required</h2>
          <p className="text-sm text-ink-muted leading-relaxed mb-6">
            Sign in to use DeadlineOS planning and inbox.
          </p>
          <div className="space-y-3">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-on-brand py-3 rounded-pill font-semibold text-sm"
            >
              <LogIn size={16} /> Sign in
            </Link>
            <Link
              href="/signup"
              className="w-full inline-flex items-center justify-center gap-2 border border-line hover:bg-surface-hover text-ink py-3 rounded-pill font-semibold text-sm"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell userName={user.name} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
