"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const FONT_SIZE_LEVELS = [50, 80, 100, 120, 150] as const;
export const DEFAULT_LEVEL = 3;
const STORAGE_KEY = "fontSizeLevel";

type Ctx = {
  level: number;
  percent: number;
  setLevel: (lv: number) => void;
};

const FontSizeContext = createContext<Ctx | null>(null);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<number>(DEFAULT_LEVEL);

  useEffect(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (saved >= 1 && saved <= FONT_SIZE_LEVELS.length) {
      setLevelState(saved);
    }
  }, []);

  useEffect(() => {
    const pct = FONT_SIZE_LEVELS[level - 1] ?? 100;
    document.documentElement.style.fontSize = `${pct}%`;
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [level]);

  function setLevel(lv: number) {
    const clamped = Math.max(1, Math.min(FONT_SIZE_LEVELS.length, lv));
    setLevelState(clamped);
    localStorage.setItem(STORAGE_KEY, String(clamped));
  }

  const percent = FONT_SIZE_LEVELS[level - 1] ?? 100;

  return (
    <FontSizeContext.Provider value={{ level, percent, setLevel }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const ctx = useContext(FontSizeContext);
  if (!ctx) throw new Error("useFontSize must be used within FontSizeProvider");
  return ctx;
}
