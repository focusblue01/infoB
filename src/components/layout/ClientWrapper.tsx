"use client";

import { LanguageProvider } from "@/lib/language-context";
import { UserProvider } from "@/lib/user-context";
import { FontSizeProvider } from "@/lib/font-size-context";
import type { UserRole } from "@/types";

export function ClientWrapper({ children, role = "N" }: { children: React.ReactNode; role?: UserRole }) {
  return (
    <FontSizeProvider>
      <LanguageProvider>
        <UserProvider role={role}>{children}</UserProvider>
      </LanguageProvider>
    </FontSizeProvider>
  );
}
