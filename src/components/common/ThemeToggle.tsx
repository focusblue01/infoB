"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon, CloudMoon, Cloud, CloudRain, Sprout } from "lucide-react";
import { useEffect, useState } from "react";

const THEMES = ["light", "dark", "cloudy-night", "gloomy", "rainy", "leaf"] as const;
type ThemeName = (typeof THEMES)[number];

const ICONS: Record<ThemeName, typeof Sun> = {
  light: Sun,
  dark: Moon,
  "cloudy-night": CloudMoon,
  gloomy: Cloud,
  rainy: CloudRain,
  leaf: Sprout,
};

const LABELS: Record<ThemeName, string> = {
  light: "Light",
  dark: "Dark",
  "cloudy-night": "Cloudy Night",
  gloomy: "Gloomy",
  rainy: "Rainy",
  leaf: "Leaf",
};

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current: ThemeName = (
    THEMES.includes((theme as ThemeName) ?? "light")
      ? (theme as ThemeName)
      : ((resolvedTheme as ThemeName) ?? "light")
  );
  const Icon = ICONS[current] ?? Sun;

  function cycle() {
    const idx = THEMES.indexOf(current);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      title={mounted ? LABELS[current] : "Theme"}
      aria-label={mounted ? LABELS[current] : "Theme"}
    >
      <Icon className="h-5 w-5" />
      <span className="sr-only">Theme: {mounted ? LABELS[current] : ""}</span>
    </Button>
  );
}
