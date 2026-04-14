"use client";

import { CATEGORIES } from "@/lib/constants";
import type { NewsCategory } from "@/types";
import { cn } from "@/lib/utils";

interface CategorySelectorProps {
  selected: NewsCategory[];
  onChange: (categories: NewsCategory[]) => void;
}

export function CategorySelector({ selected, onChange }: CategorySelectorProps) {
  function toggle(cat: NewsCategory) {
    if (selected.includes(cat)) {
      onChange(selected.filter((c) => c !== cat));
    } else {
      onChange([...selected, cat]);
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {CATEGORIES.map((cat) => {
        const active = selected.includes(cat.value);
        return (
          <button
            key={cat.value}
            type="button"
            onClick={() => toggle(cat.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary/50",
              active ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <span className="text-2xl">{cat.emoji}</span>
            <span className={cn("text-sm font-medium", active && "text-primary")}>
              {cat.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
