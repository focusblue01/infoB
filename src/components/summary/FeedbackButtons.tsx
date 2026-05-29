"use client";

import { Button } from "@/components/ui/button";
import { ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackButtonsProps {
  feedback: boolean | null; // true=like, null=none
  onFeedback: (isPositive: boolean) => void;
}

export function FeedbackButtons({ feedback, onFeedback }: FeedbackButtonsProps) {
  const liked = feedback === true;
  return (
    <div className="flex items-center gap-1">
      <Button
        variant={liked ? "default" : "outline"}
        size="sm"
        onClick={() => onFeedback(!liked)}
        aria-pressed={liked}
        className={cn(
          "gap-1 transition-colors",
          liked && "bg-green-600 text-white hover:bg-green-700 border-green-600"
        )}
      >
        <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} />
        <span className="text-xs">좋아요</span>
      </Button>
    </div>
  );
}
