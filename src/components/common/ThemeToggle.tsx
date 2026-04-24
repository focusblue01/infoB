"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon, CloudMoon, Cloud, CloudRain, Sprout, SunMedium, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const THEMES = ["light", "dark", "cloudy-night", "gloomy", "rainy", "leaf", "sunny"] as const;
type ThemeName = (typeof THEMES)[number];

const ICONS: Record<ThemeName, typeof Sun> = {
  light: Sun,
  dark: Moon,
  "cloudy-night": CloudMoon,
  gloomy: Cloud,
  rainy: CloudRain,
  leaf: Sprout,
  sunny: SunMedium,
};

const LABELS: Record<ThemeName, string> = {
  light: "Light",
  dark: "Dark",
  "cloudy-night": "Cloudy Night",
  gloomy: "Gloomy",
  rainy: "Rainy",
  leaf: "Leaf",
  sunny: "Sunny",
};

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current: ThemeName = THEMES.includes((theme as ThemeName) ?? "light")
    ? (theme as ThemeName)
    : ((resolvedTheme as ThemeName) ?? "light");
  const Icon = ICONS[current] ?? Sun;

  function select(name: ThemeName) {
    setTheme(name);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        title={mounted ? LABELS[current] : "Theme"}
        aria-label={mounted ? LABELS[current] : "Theme"}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Icon className="h-5 w-5" />
        <span className="sr-only">Theme: {mounted ? LABELS[current] : ""}</span>
      </Button>
      {open && mounted && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-44 rounded-md border border-border bg-background text-foreground shadow-md z-50 overflow-hidden"
        >
          <ul className="py-1">
            {THEMES.map((name) => {
              const ItemIcon = ICONS[name];
              const selected = name === current;
              return (
                <li key={name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => select(name)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <ItemIcon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{LABELS[name]}</span>
                    {selected && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
