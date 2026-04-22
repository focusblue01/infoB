"use client";

import { Badge } from "@/components/ui/badge";
import { CATEGORY_COLORS, type NewsCategory } from "@/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

export function CategoryBadge({ category }: { category: NewsCategory }) {
  const { t } = useLanguage();
  return (
    <Badge variant="outline" className={cn("text-xs", CATEGORY_COLORS[category])}>
      {t.categoryLabels[category]}
    </Badge>
  );
}
