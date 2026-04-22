"use client";

import { LanguageProvider } from "@/lib/language-context";

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
