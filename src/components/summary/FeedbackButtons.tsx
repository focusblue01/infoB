"use client";

import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackButtonsProps {
  feedback: boolean | null; // true=like, false=dislike, null=none
  onFeedback: (isPositive: boolean) => void;
}

export function FeedbackButtons({ feedback, onFeedback }: FeedbackButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFeedback(true)}
        className={cn("gap-1", feedback === true && "text-green-600 bg-green-50 dark:bg-green-950")}
      >
        <ThumbsUp className="h-4 w-4" />
        <span className="text-xs">유용해요</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFeedback(false)}
        className={cn("gap-1", feedback === false && "text-red-600 bg-red-50 dark:bg-red-950")}
      >
        <ThumbsDown className="h-4 w-4" />
        <span className="text-xs">아쉬워요</span>
      </Button>
    </div>
  );
}
