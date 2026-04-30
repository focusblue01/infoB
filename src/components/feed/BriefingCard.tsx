"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/feed/CategoryBadge";
import { BookmarkButton } from "@/components/summary/BookmarkButton";
import { truncate } from "@/lib/utils";
import type { NewsCategory } from "@/types";
import { FileText, Flame, Landmark } from "lucide-react";
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
  const cat = category as unknown as string | null;
  const isTrending = cat === "trending";
  const isPolicy = cat === "global-policy";
  const isSystem = isTrending || isPolicy;

  const cardBorder = isPolicy
    ? "border-indigo-300 dark:border-indigo-700/60"
    : isTrending
      ? "border-orange-300 dark:border-orange-700/60"
      : "";

  return (
    <Card className={`group hover:shadow-md transition-shadow ${cardBorder}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isPolicy ? (
                <Badge
                  variant="outline"
                  className="text-xs gap-1 border-indigo-400 text-indigo-600 dark:text-indigo-400"
                >
                  <Landmark className="h-3 w-3" />
                  {t.globalPolicyLabel}
                </Badge>
              ) : isTrending ? (
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
              <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors cursor-pointer truncate md:whitespace-normal">
                {displayTitle}
              </h3>
            </Link>
          </div>
          {showBookmark && <BookmarkButton isBookmarked={isBookmarked} onToggle={() => onBookmarkToggle(id)} />}
        </div>
      </CardHeader>
      <CardContent>
        <Link href={`/feed/${id}`}>
          {/* 모바일: 한 줄로 자름 / 데스크톱: 기존 그대로 */}
          <p className="text-sm text-muted-foreground leading-relaxed cursor-pointer truncate md:whitespace-normal md:overflow-visible">
            {truncate(displayContent, 200)}
          </p>
        </Link>
        {/* 기사 개수 표시: 모바일 숨김(간소화), 데스크톱에서만 노출.
            시스템 브리핑은 article_ids 가 의미가 다르므로 항상 숨김. */}
        {!isSystem && (
          <div className="hidden md:flex items-center gap-1 mt-3 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>{t.articlesAnalyzed(articleCount)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
