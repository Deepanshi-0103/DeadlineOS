"use client";

import { Suspense, type ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

const MobileNavCtx = createContext<() => void>(() => {});

export function useOpenMobileNav() {
  return useContext(MobileNavCtx);
}

interface AppShellProps {
  userName: string;
  userEmail?: string;
  children: ReactNode;
}

function ShellChrome({
  userName,
  userEmail,
  children,
}: {
  userName: string;
  userEmail: string;
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen w-full flex bg-base text-ink">
      <Sidebar userName={userName} userEmail={userEmail} />
      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        userName={userName}
      />
      <MobileNavCtx.Provider value={() => setMobileNavOpen(true)}>
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </MobileNavCtx.Provider>
    </div>
  );
}

/** Shared authenticated chrome — sidebar + mobile drawer */
export function AppShell({ userName, userEmail = "", children }: AppShellProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex bg-base items-center justify-center">
          <div className="w-9 h-9 rounded-full border-2 border-line border-t-brand animate-spin" />
        </div>
      }
    >
      <ShellChrome userName={userName} userEmail={userEmail}>
        {children}
      </ShellChrome>
    </Suspense>
  );
}
