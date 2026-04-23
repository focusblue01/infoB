"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const FONT_SIZE_MIN = 50;
export const FONT_SIZE_MAX = 150;
export const FONT_SIZE_DEFAULT = 100;
export const FONT_SIZE_STEP = 5;
const STORAGE_KEY = "fontSizePercent";

type Ctx = {
  percent: number;
  setPercent: (pct: number) => void;
};

const FontSizeContext = createContext<Ctx | null>(null);

function clamp(v: number) {
  return Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, v));
}

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [percent, setPercentState] = useState<number>(FONT_SIZE_DEFAULT);

  useEffect(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (saved >= FONT_SIZE_MIN && saved <= FONT_SIZE_MAX) {
      setPercentState(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${percent}%`;
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [percent]);

  function setPercent(pct: number) {
    const v = clamp(Math.round(pct));
    setPercentState(v);
    localStorage.setItem(STORAGE_KEY, String(v));
  }

  return (
    <FontSizeContext.Provider value={{ percent, setPercent }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const ctx = useContext(FontSizeContext);
  if (!ctx) throw new Error("useFontSize must be used within FontSizeProvider");
  return ctx;
}
