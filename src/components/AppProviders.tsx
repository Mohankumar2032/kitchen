"use client";

import { ThemeProvider } from "@/components/storefront/ThemeProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
