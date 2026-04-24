"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CategoryBadge } from "@/components/feed/CategoryBadge";
import { Button } from "@/components/ui/button";
import { Bookmark, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

interface BookmarkItem {
  id: string;
  summary_id: string;
  summaries: {
    id: string;
    title: string;
    content: string;
    category: string | null;
    keywords: string[] | null;
    briefing_date: string;
  };
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    fetch("/api/bookmarks")
      .then((r) => r.json())
      .then((d) => setBookmarks(d.bookmarks ?? []))
      .finally(() => setLoading(false));
  }, []);

  function removeBookmark(summaryId: string) {
    const snapshot = bookmarks;
    setBookmarks((prev) => prev.filter((b) => b.summary_id !== summaryId));
    fetch(`/api/bookmarks?summary_id=${summaryId}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("bookmark delete failed");
      })
      .catch(() => {
        setBookmarks(snapshot);
      });
  }

  const grouped = useMemo(() => {
    const map = new Map<string, BookmarkItem[]>();
    for (const b of bookmarks) {
      const key = b.summaries.briefing_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [bookmarks]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold max-md:px-3">{t.bookmarks}</h1>

      {loading ? (
        <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-20 space-y-4 max-md:px-3">
          <Bookmark className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">{t.noBookmarks}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, items]) => (
            <section key={date} className="space-y-2">
              <div className="flex items-center gap-3 max-md:px-3">
                <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">
                  {formatDate(date)}
                </span>
                <div className="flex-1 border-t border-border" />
              </div>
              <div className="space-y-2">
                {items.map((b) => (
                  <Card key={b.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/feed/${b.summaries.id}`} className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            {b.summaries.category && (
                              <span className="shrink-0">
                                <CategoryBadge category={b.summaries.category as any} />
                              </span>
                            )}
                            {(b.summaries.keywords ?? []).slice(0, 3).map((kw) => (
                              <span
                                key={kw}
                                className="shrink-0 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
                              >
                                {kw}
                              </span>
                            ))}
                            <h3 className="font-semibold truncate hover:text-primary transition-colors">
                              {b.summaries.title}
                            </h3>
                          </div>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => removeBookmark(b.summary_id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground truncate">{b.summaries.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
