"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CategoryBadge } from "@/components/feed/CategoryBadge";
import { BookmarkButton } from "@/components/summary/BookmarkButton";
import { FeedbackButtons } from "@/components/summary/FeedbackButtons";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ExternalLink, Calendar, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useUserRole } from "@/lib/user-context";
import { canBookmark } from "@/lib/permissions";

export default function SummaryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const { language, t } = useLanguage();
  const role = useUserRole();
  const bookmarkEnabled = canBookmark(role);

  useEffect(() => {
    fetch(`/api/summaries/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (language === "en" && d.summary && !d.summary.content_en) {
          translateSummary(d.summary.id);
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  // 언어 전환 시 번역 자동 트리거
  useEffect(() => {
    if (language === "en" && data?.summary && !data.summary.content_en) {
      translateSummary(data.summary.id);
    }
  }, [language]);

  async function translateSummary(id: string) {
    setTranslating(true);
    try {
      const res = await fetch("/api/summaries/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryIds: [id] }),
      });
      const result = await res.json();
      if (result.translations?.[id]) {
        setData((prev: any) => ({
          ...prev,
          summary: {
            ...prev.summary,
            title_en: result.translations[id].title_en,
            content_en: result.translations[id].content_en,
          },
        }));
      }
    } finally {
      setTranslating(false);
    }
  }

  async function toggleBookmark() {
    if (!data) return;
    if (data.is_bookmarked) {
      await fetch(`/api/bookmarks?summary_id=${params.id}`, { method: "DELETE" });
    } else {
      await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary_id: params.id }),
      });
    }
    setData((prev: any) => ({ ...prev, is_bookmarked: !prev.is_bookmarked }));
  }

  async function handleFeedback(isPositive: boolean) {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary_id: params.id, is_positive: isPositive }),
    });
    setData((prev: any) => ({ ...prev, user_feedback: isPositive }));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!data?.summary) {
    return <div className="text-center py-20 text-muted-foreground">{t.summaryNotFound}</div>;
  }

  const { summary, articles } = data;
  const displayTitle = language === "en" && summary.title_en ? summary.title_en : summary.title;
  const displayContent = language === "en" && summary.content_en ? summary.content_en : summary.content;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between max-md:px-3">
        <Button variant="ghost" onClick={() => router.back()} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> {t.backToFeed}
        </Button>
        {translating && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {language === "en" ? "Translating..." : "번역 중..."}
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {summary.category && <CategoryBadge category={summary.category} />}
                {summary.keywords?.map((kw: string) => (
                  <span key={kw} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    {kw}
                  </span>
                ))}
              </div>
              <h1 className="text-2xl font-bold leading-tight">{displayTitle}</h1>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(summary.briefing_date)}
              </div>
            </div>
            {bookmarkEnabled && <BookmarkButton isBookmarked={data.is_bookmarked} onToggle={toggleBookmark} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {displayContent.split("\n").map((line: string, i: number) => {
              if (line.startsWith("[") && line.includes("]")) {
                const bracket = line.indexOf("]");
                const heading = line.slice(1, bracket);
                const rest = line.slice(bracket + 1).trim();
                return (
                  <div key={i} className="mt-4 first:mt-0">
                    <h3 className="text-base font-bold text-primary mb-1">{heading}</h3>
                    {rest && <p className="text-[15px] leading-relaxed">{rest}</p>}
                  </div>
                );
              }
              if (!line.trim()) return <br key={i} />;
              return <p key={i} className="text-[15px] leading-relaxed">{line}</p>;
            })}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t.feedbackPrompt}</span>
            <FeedbackButtons feedback={data.user_feedback} onFeedback={handleFeedback} />
          </div>

          <Separator />

          {articles?.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">{t.sourceArticles(articles.length)}</h3>
              <div className="space-y-2">
                {articles.map((a: any) => (
                  <a
                    key={a.id}
                    href={a.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.source_name}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
