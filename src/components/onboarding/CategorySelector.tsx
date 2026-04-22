"use client";

import { CATEGORIES, MAX_CATEGORIES } from "@/lib/constants";
import type { NewsCategory } from "@/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

interface CategorySelectorProps {
  selected: NewsCategory[];
  onChange: (categories: NewsCategory[]) => void;
}

export function CategorySelector({ selected, onChange }: CategorySelectorProps) {
  const { t } = useLanguage();

  function toggle(cat: NewsCategory) {
    if (selected.includes(cat)) {
      onChange(selected.filter((c) => c !== cat));
    } else if (selected.length < MAX_CATEGORIES) {
      onChange([...selected, cat]);
    }
  }

  const isMaxReached = selected.length >= MAX_CATEGORIES;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <span className="text-xs text-muted-foreground">{selected.length}/{MAX_CATEGORIES}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATEGORIES.map((cat) => {
          const active = selected.includes(cat.value);
          const disabled = !active && isMaxReached;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => toggle(cat.value)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                active ? "border-primary bg-primary/5" : "border-border",
                disabled ? "opacity-40 cursor-not-allowed" : "hover:border-primary/50"
              )}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className={cn("text-sm font-medium", active && "text-primary")}>
                {t.categoryLabels[cat.value]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
