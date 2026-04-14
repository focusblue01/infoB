"use client";

import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onToggle: () => void;
}

export function BookmarkButton({ isBookmarked, onToggle }: BookmarkButtonProps) {
  return (
    <Button variant="ghost" size="icon" onClick={onToggle} className="shrink-0">
      <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current text-primary")} />
    </Button>
  );
}
