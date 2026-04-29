"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/feed/CategoryBadge";
import { BookmarkButton } from "@/components/summary/BookmarkButton";
import { truncate } from "@/lib/utils";
import type { NewsCategory } from "@/types";
import { FileText, Flame } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface BriefingCardProps {
  id: string;
  title: string;
  content: string;
  titleEn?: string | null;
  contentEn?: string | null;
  category: NewsCategory | null;
  keywords: string[];
  articleCount: number;
  isBookmarked: boolean;
  onBookmarkToggle: (id: string) => void;
  showBookmark?: boolean;
}

export function BriefingCard({
  id, title, content, titleEn, contentEn,
  category, keywords, articleCount, isBookmarked, onBookmarkToggle,
  showBookmark = true,
}: BriefingCardProps) {
  const { language, t } = useLanguage();
  const displayTitle = language === "en" && titleEn ? titleEn : title;
  const displayContent = language === "en" && contentEn ? contentEn : content;
  const isTrending = (category as unknown as string) === "trending";

  return (
    <Card
      className={
        isTrending
          ? "group hover:shadow-md transition-shadow border-orange-300 dark:border-orange-700/60"
          : "group hover:shadow-md transition-shadow"
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {isTrending ? (
                <Badge
                  variant="outline"
                  className="text-xs gap-1 border-orange-400 text-orange-600 dark:text-orange-400"
                >
                  <Flame className="h-3 w-3" />
                  {t.gossipTrendsLabel}
                </Badge>
              ) : (
                category && <CategoryBadge category={category} />
              )}
              {keywords.slice(0, 3).map((kw) => (
                <span key={kw} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {kw}
                </span>
              ))}
            </div>
            <Link href={`/feed/${id}`}>
              <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors cursor-pointer">
                {displayTitle}
              </h3>
            </Link>
          </div>
          {showBookmark && <BookmarkButton isBookmarked={isBookmarked} onToggle={() => onBookmarkToggle(id)} />}
        </div>
      </CardHeader>
      <CardContent>
        <Link href={`/feed/${id}`}>
          <p className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
            {truncate(displayContent, 200)}
          </p>
        </Link>
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span>{t.articlesAnalyzed(articleCount)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
