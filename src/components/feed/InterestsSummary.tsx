"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings2, Tag, Ban, Folder } from "lucide-react";
import { CATEGORY_COLORS, type NewsCategory } from "@/types";
import { useLanguage } from "@/lib/language-context";

interface InterestsData {
  categories: { category: NewsCategory }[];
  keywords: { keyword: string }[];
  excludeKeywords: { keyword: string }[];
}

export function InterestsSummary() {
  const [data, setData] = useState<InterestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    fetch("/api/interests")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-32 rounded-lg bg-muted animate-pulse" />;
  }

  if (!data) return null;

  const categories = data.categories ?? [];
  const keywords = data.keywords ?? [];
  const excludeKeywords = data.excludeKeywords ?? [];
  const hasAny = categories.length + keywords.length + excludeKeywords.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">{t.myInterests}</CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Link href="/settings">
            <Settings2 className="h-3.5 w-3.5" />
            {t.edit}
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasAny && (
          <p className="text-sm text-muted-foreground">
            {t.noInterests}{" "}
            <Link href="/settings" className="text-primary hover:underline">
              {t.addInSettingsLink}
            </Link>
            {t.addInSettingsSuffix}
          </p>
        )}

        {categories.length > 0 && (
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground min-w-[70px] pt-1">
              <Folder className="h-3.5 w-3.5" />
              {t.categories}
            </div>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {categories.map((c) => (
                <Badge
                  key={c.category}
                  variant="secondary"
                  className={CATEGORY_COLORS[c.category]}
                >
                  {t.categoryLabels[c.category]}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {keywords.length > 0 && (
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground min-w-[70px] pt-1">
              <Tag className="h-3.5 w-3.5" />
              {t.interestKeywords}
            </div>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {keywords.map((k) => (
                <Badge key={k.keyword} variant="default">
                  {k.keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {excludeKeywords.length > 0 && (
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground min-w-[70px] pt-1">
              <Ban className="h-3.5 w-3.5" />
              {t.excludeKeywords}
            </div>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {excludeKeywords.map((k) => (
                <Badge key={k.keyword} variant="destructive">
                  {k.keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
