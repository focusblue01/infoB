"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CategoryBadge } from "@/components/feed/CategoryBadge";
import { BookmarkButton } from "@/components/summary/BookmarkButton";
import { FeedbackButtons } from "@/components/summary/FeedbackButtons";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ExternalLink, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function SummaryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/summaries/${params.id}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [params.id]);

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
    return <div className="space-y-4"><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="h-64 bg-muted animate-pulse rounded-lg" /></div>;
  }

  if (!data?.summary) {
    return <div className="text-center py-20 text-muted-foreground">요약을 찾을 수 없습니다.</div>;
  }

  const { summary, articles } = data;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" onClick={() => router.back()} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> 피드로 돌아가기
      </Button>

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
              <h1 className="text-2xl font-bold leading-tight">{summary.title}</h1>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(summary.briefing_date)}
              </div>
            </div>
            <BookmarkButton isBookmarked={data.is_bookmarked} onToggle={toggleBookmark} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 요약 본문 */}
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {summary.content.split("\n").map((line: string, i: number) => {
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

          {/* 피드백 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">이 요약이 도움이 되었나요?</span>
            <FeedbackButtons feedback={data.user_feedback} onFeedback={handleFeedback} />
          </div>

          <Separator />

          {/* 원문 기사 */}
          {articles?.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">원문 기사 ({articles.length}건)</h3>
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
