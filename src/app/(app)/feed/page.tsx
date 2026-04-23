"use client";

import { useEffect, useState } from "react";
import { BriefingCard } from "@/components/feed/BriefingCard";
import { InterestsSummary } from "@/components/feed/InterestsSummary";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Newspaper, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useUserRole } from "@/lib/user-context";
import { canGenerate, canGenerateUnlimited, canNavigateDates, canBookmark } from "@/lib/permissions";

interface SummaryItem {
  id: string;
  title: string;
  content: string;
  title_en: string | null;
  content_en: string | null;
  category: string | null;
  keywords: string[];
  article_ids: string[];
  is_bookmarked: boolean;
}

interface MissingGroup {
  key: string;
  type: string;
}

function getKSTDate(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

export default function FeedPage() {
  const [date, setDate] = useState(() => getKSTDate());
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [missingGroups, setMissingGroups] = useState<MissingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const { language, t } = useLanguage();
  const role = useUserRole();
  const showGenerate = canGenerate(role);
  const dateNavEnabled = canNavigateDates(role);
  const bookmarkEnabled = canBookmark(role);

  useEffect(() => {
    fetchFeed(date);
  }, [date]);

  // 영어 전환 시 번역 자동 트리거
  useEffect(() => {
    if (language === "en" && summaries.length > 0) {
      ensureTranslations(summaries);
    }
  }, [language]);

  async function fetchFeed(targetDate: string) {
    setLoading(true);
    const res = await fetch(`/api/feed?date=${targetDate}`);
    const data = await res.json();
    const items = data.summaries ?? [];
    setSummaries(items);
    setMissingGroups(data.missingGroups ?? []);
    setLoading(false);
    // 피드 로드 후 EN이면 번역 확인
    if (language === "en" && items.length > 0) {
      ensureTranslations(items);
    }
  }

  async function ensureTranslations(items: SummaryItem[]) {
    const needTranslation = items.filter((s) => !s.content_en).map((s) => s.id);
    if (needTranslation.length === 0) return;

    setTranslating(true);
    try {
      const res = await fetch("/api/summaries/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryIds: needTranslation }),
      });
      const data = await res.json();
      if (data.translations) {
        setSummaries((prev) =>
          prev.map((s) =>
            data.translations[s.id]
              ? { ...s, title_en: data.translations[s.id].title_en, content_en: data.translations[s.id].content_en }
              : s
          )
        );
      }
    } finally {
      setTranslating(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateMsg(null);
    try {
      const res = await fetch("/api/briefing/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setGenerateMsg(`❌ ${data.error ?? t.generateFailed}`);
      } else {
        setGenerateMsg(t.generateSuccess(data.collected, data.summariesSucceeded));
        const today = getKSTDate();
        if (date === today) {
          await fetchFeed(today);
        } else {
          setDate(today);
        }
      }
    } catch (e: any) {
      setGenerateMsg(`❌ ${e.message}`);
    } finally {
      setGenerating(false);
      setTimeout(() => setGenerateMsg(null), 8000);
    }
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
      prev.map((s) => s.id === summaryId ? { ...s, is_bookmarked: !s.is_bookmarked } : s)
    );
  }

  const today = getKSTDate();
  const isToday = date === today;

  return (
    <div className="space-y-6">
      <InterestsSummary />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t.todayBriefing}</h1>
          {showGenerate && (
            <Button onClick={handleGenerate} disabled={generating} size="sm" className="gap-1">
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{t.generating}</>
              ) : (
                <><Sparkles className="h-4 w-4" />{t.generateNow}</>
              )}
            </Button>
          )}
          {translating && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {/* 날짜 네비게이션 */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => changeDate(-1)} disabled={!dateNavEnabled}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {formatDate(date)}
          </span>
          <Button variant="outline" size="icon" onClick={() => changeDate(1)} disabled={isToday || !dateNavEnabled}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {generateMsg && (
        <div className="rounded-md bg-muted px-4 py-2 text-sm">{generateMsg}</div>
      )}

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
            <p className="font-medium">{t.noBriefings}</p>
            <p className="text-sm text-muted-foreground">
              {isToday ? t.noBriefingsToday : t.noBriefingsDate}
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
              titleEn={s.title_en}
              contentEn={s.content_en}
              category={s.category as any}
              keywords={s.keywords}
              articleCount={s.article_ids?.length ?? 0}
              isBookmarked={s.is_bookmarked}
              onBookmarkToggle={toggleBookmark}
              showBookmark={bookmarkEnabled}
            />
          ))}
          {missingGroups.filter((g) => g.type === "keyword").length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 px-4 py-3 space-y-2">
              {missingGroups
                .filter((g) => g.type === "keyword")
                .map((g) => (
                  <div key={g.key} className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="font-medium">{g.key}</span>
                    <span className="text-yellow-700 dark:text-yellow-400">— {t.noArticlesFound}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
