"use client";

import { useEffect, useState } from "react";
import { BriefingCard } from "@/components/feed/BriefingCard";
import { InterestsSummary } from "@/components/feed/InterestsSummary";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface SummaryItem {
  id: string;
  title: string;
  content: string;
  category: string | null;
  keywords: string[];
  article_ids: string[];
  is_bookmarked: boolean;
}

export default function FeedPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed();
  }, [date]);

  async function fetchFeed() {
    setLoading(true);
    const res = await fetch(`/api/feed?date=${date}`);
    const data = await res.json();
    setSummaries(data.summaries ?? []);
    setLoading(false);
  }

  function changeDate(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split("T")[0]);
  }

  async function toggleBookmark(summaryId: string) {
    const item = summaries.find((s) => s.id === summaryId);
    if (!item) return;

    if (item.is_bookmarked) {
      await fetch(`/api/bookmarks?summary_id=${summaryId}`, { method: "DELETE" });
    } else {
      await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary_id: summaryId }),
      });
    }
    setSummaries((prev) =>
      prev.map((s) =>
        s.id === summaryId ? { ...s, is_bookmarked: !s.is_bookmarked } : s
      )
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const isToday = date === today;

  return (
    <div className="space-y-6">
      {/* 관심사 요약 */}
      <InterestsSummary />

      {/* 날짜 네비게이션 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">오늘의 브리핑</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {formatDate(date)}
          </span>
          <Button variant="outline" size="icon" onClick={() => changeDate(1)} disabled={isToday}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 콘텐츠 */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : summaries.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <div>
            <p className="font-medium">브리핑이 없습니다</p>
            <p className="text-sm text-muted-foreground">
              {isToday
                ? "오늘의 브리핑이 아직 생성되지 않았습니다. 매일 오전 6시에 자동 생성됩니다."
                : "이 날짜에는 브리핑이 없습니다."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map((s) => (
            <BriefingCard
              key={s.id}
              id={s.id}
              title={s.title}
              content={s.content}
              category={s.category as any}
              keywords={s.keywords}
              articleCount={s.article_ids?.length ?? 0}
              isBookmarked={s.is_bookmarked}
              onBookmarkToggle={toggleBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
}
