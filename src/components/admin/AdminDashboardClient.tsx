"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, Users, Tag, Rss, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

interface Props {
  rssCount: number;
  userCount: number;
  groupCount: number;
  articleCount: number;
}

function getKstTodayYmd(): string {
  // 현재 시각을 KST 로 환산해 yyyy-mm-dd 반환
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export function AdminDashboardClient({ rssCount, userCount, groupCount, articleCount }: Props) {
  const { t } = useLanguage();
  const [running, setRunning] = useState<null | "collect" | "regenerate">(null);
  const [result, setResult] = useState<string | null>(null);
  const [date, setDate] = useState<string>(() => getKstTodayYmd());

  const stats = [
    { label: t.adminNavRss, value: rssCount, icon: Database, href: "/admin/rss" },
    { label: t.adminNavUsers, value: userCount, icon: Users, href: "/admin/users" },
    { label: t.adminNavCategories, value: groupCount, icon: Tag, href: "/admin/categories" },
    { label: "Articles", value: articleCount, icon: Rss, href: null },
  ];

  async function recollect() {
    if (!window.confirm(t.adminRecollectConfirm(date))) return;
    setRunning("collect");
    setResult(null);
    try {
      const res = await fetch("/api/admin/recollect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(
          `✓ collected: ${data.collected ?? 0}, skipped: ${data.skipped ?? 0}, reclassified: ${data.reclassified ?? 0}`
        );
      } else {
        setResult(`✗ ${data.error ?? "failed"}`);
      }
    } catch (e: any) {
      setResult(`✗ ${e?.message ?? "failed"}`);
    } finally {
      setRunning(null);
    }
  }

  async function regenerate() {
    if (!window.confirm(t.adminRegenerateConfirm(date))) return;
    setRunning("regenerate");
    setResult(null);
    try {
      const res = await fetch("/api/admin/regenerate-briefings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(
          `✓ ${data.briefingDate} — deleted: ${data.deleted ?? 0}, succeeded: ${data.succeeded ?? 0}, failed: ${data.failed ?? 0}`
        );
      } else {
        setResult(`✗ ${data.error ?? "failed"}`);
      }
    } catch (e: any) {
      setResult(`✗ ${e?.message ?? "failed"}`);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">{t.adminDashboard}</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className={s.href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}>
            {s.href ? (
              <Link href={s.href}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{s.value.toLocaleString()}</p>
                </CardContent>
              </Link>
            ) : (
              <>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{s.value.toLocaleString()}</p>
                </CardContent>
              </>
            )}
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.adminToolsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t.adminTargetDate}</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={running !== null}
                className="w-44"
              />
            </div>
            <Button
              variant="outline"
              onClick={recollect}
              disabled={running !== null || !date}
              className="gap-2"
            >
              {running === "collect" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.adminRunningRecollect}
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4" />
                  {t.adminRecollect}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={regenerate}
              disabled={running !== null || !date}
              className="gap-2"
            >
              {running === "regenerate" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.adminRunningRegenerate}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t.adminRegenerate}
                </>
              )}
            </Button>
          </div>
          {result && (
            <p className="text-sm text-muted-foreground font-mono break-all">{result}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
