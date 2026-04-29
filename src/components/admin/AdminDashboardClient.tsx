"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, Users, Tag, Rss, Loader2, RefreshCcw, Sparkles, Plug, Brain } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

interface Props {
  rssCount: number;
  userCount: number;
  groupCount: number;
  articleCount: number;
  articleTodayCount: number;
}

function getKstTodayYmd(): string {
  // 현재 시각을 KST 로 환산해 yyyy-mm-dd 반환
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export function AdminDashboardClient({ rssCount, userCount, groupCount, articleCount, articleTodayCount }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [running, setRunning] = useState<null | "collect" | "regenerate" | "test" | "classify">(null);
  const [result, setResult] = useState<string | null>(null);
  const [testReport, setTestReport] = useState<any | null>(null);
  const [date, setDate] = useState<string>(() => getKstTodayYmd());

  const stats: Array<{
    label: string;
    value: number;
    secondary?: { label: string; value: number };
    icon: typeof Database;
    href: string | null;
  }> = [
    { label: t.adminNavRss, value: rssCount, icon: Database, href: "/admin/rss" },
    { label: t.adminNavUsers, value: userCount, icon: Users, href: "/admin/users" },
    { label: t.adminNavCategories, value: groupCount, icon: Tag, href: "/admin/categories" },
    {
      label: "Articles",
      value: articleTodayCount,
      secondary: { label: t.adminTotal, value: articleCount },
      icon: Rss,
      href: null,
    },
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
        router.refresh();
      } else {
        setResult(`✗ ${data.error ?? "failed"}`);
      }
    } catch (e: any) {
      setResult(`✗ ${e?.message ?? "failed"}`);
    } finally {
      setRunning(null);
    }
  }

  async function classifyRecent() {
    setRunning("classify");
    setResult(null);
    try {
      const res = await fetch("/api/admin/classify-recent", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResult(
          `✓ AI classify — considered: ${data.considered ?? 0}, stage1: ${data.stage1Updated ?? 0}, stage2: ${data.stage2Updated ?? 0}, remaining: ${data.remaining ?? 0} (${data.durationMs ?? 0}ms)`
        );
        router.refresh();
      } else {
        setResult(`✗ ${data.error ?? "failed"}`);
      }
    } catch (e: any) {
      setResult(`✗ ${e?.message ?? "failed"}`);
    } finally {
      setRunning(null);
    }
  }

  async function testProviders() {
    setRunning("test");
    setResult(null);
    setTestReport(null);
    try {
      const res = await fetch("/api/admin/test-providers", { method: "POST" });
      const data = await res.json();
      setTestReport(data);
      if (data.success) {
        const lines = (data.perRole ?? []).map((r: any) =>
          `${r.role}: ${r.provider} ${r.ok ? "✓" : "✗"} ${r.ok ? `(${r.durationMs}ms)` : `— ${r.error}`}`
        );
        setResult(lines.join(" | "));
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
        router.refresh();
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {s.label}
                    {s.secondary && (
                      <span className="ml-1 text-xs font-normal">
                        ({t.adminToday}/{s.secondary.label})
                      </span>
                    )}
                  </CardTitle>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {s.value.toLocaleString()}
                    {s.secondary && (
                      <span className="text-base font-normal text-muted-foreground ml-1">
                        / {s.secondary.value.toLocaleString()}
                      </span>
                    )}
                  </p>
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
            <Button
              variant="outline"
              onClick={classifyRecent}
              disabled={running !== null}
              className="gap-2"
            >
              {running === "classify" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.adminRunningClassify}
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  {t.adminClassifyRecent}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={testProviders}
              disabled={running !== null}
              className="gap-2"
            >
              {running === "test" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.adminRunningTest}
                </>
              ) : (
                <>
                  <Plug className="h-4 w-4" />
                  {t.adminTestProviders}
                </>
              )}
            </Button>
          </div>
          {result && (
            <p className="text-sm text-muted-foreground font-mono break-all">{result}</p>
          )}
          {testReport && (
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{JSON.stringify(testReport, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
