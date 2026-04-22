"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CategoryBadge } from "@/components/feed/CategoryBadge";
import { Button } from "@/components/ui/button";
import { Bookmark, Trash2 } from "lucide-react";
import { formatDate, truncate } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    fetch("/api/bookmarks")
      .then((r) => r.json())
      .then((d) => setBookmarks(d.bookmarks ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function removeBookmark(summaryId: string) {
    await fetch(`/api/bookmarks?summary_id=${summaryId}`, { method: "DELETE" });
    setBookmarks((prev) => prev.filter((b) => b.summary_id !== summaryId));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.bookmarks}</h1>

      {loading ? (
        <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <Bookmark className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">{t.noBookmarks}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((b) => (
            <Card key={b.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Link href={`/feed/${b.summaries.id}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {b.summaries.category && <CategoryBadge category={b.summaries.category} />}
                        <span className="text-xs text-muted-foreground">{formatDate(b.summaries.briefing_date)}</span>
                      </div>
                      <h3 className="font-semibold hover:text-primary transition-colors">{b.summaries.title}</h3>
                    </div>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => removeBookmark(b.summary_id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{truncate(b.summaries.content, 150)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
