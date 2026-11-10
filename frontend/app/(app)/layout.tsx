"use client";

import { AuthProvider, AuthenticatedLayout } from "@/components/layout/auth-provider";

/**
 * Route-group layout for all authenticated product pages.
 * Keeps sidebar + session alive across Home / Goals / Tasks / Inbox / etc.
 */
export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </AuthProvider>
  );
}
