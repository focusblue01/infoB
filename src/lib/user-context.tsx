"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UserRole } from "@/types";

interface UserContextValue {
  role: UserRole;
}

const UserContext = createContext<UserContextValue>({ role: "N" });

export function UserProvider({ role, children }: { role: UserRole; children: ReactNode }) {
  return <UserContext.Provider value={{ role }}>{children}</UserContext.Provider>;
}

export function useUserRole(): UserRole {
  return useContext(UserContext).role;
}
