import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, CATEGORY_COLORS, type NewsCategory } from "@/types";
import { cn } from "@/lib/utils";

export function CategoryBadge({ category }: { category: NewsCategory }) {
  return (
    <Badge variant="outline" className={cn("text-xs", CATEGORY_COLORS[category])}>
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}
