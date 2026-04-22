"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Newspaper, Bookmark, Settings, Flame, LogOut, Sparkles, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { createClient } from "@/lib/supabase/client";

interface Props {
  displayName: string | null;
  streakCount: number;
}

function DashboardContent({ displayName, streakCount }: Props) {
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const quickLinks = [
    {
      href: "/feed",
      icon: Sparkles,
      title: t.goToFeed,
      desc: t.goToFeedDesc,
      primary: true,
    },
    {
      href: "/bookmarks",
      icon: Bookmark,
      title: t.goToBookmarks,
      desc: t.goToBookmarksDesc,
      primary: false,
    },
    {
      href: "/settings",
      icon: Settings,
      title: t.navSettings,
      desc: t.goToSettingsDesc,
      primary: false,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="border-b">
        <div className="mx-auto max-w-5xl flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Newspaper className="h-5 w-5 text-primary" />
            <span>InfoB</span>
          </div>
          <div className="flex items-center gap-2">
            {/* KO/EN 토글 */}
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold transition-colors ${language === "ko" ? "text-foreground" : "text-muted-foreground"}`}>KO</span>
              <Switch
                checked={language === "en"}
                onCheckedChange={(checked) => setLanguage(checked ? "en" : "ko")}
                aria-label={t.langLabel}
              />
              <span className={`text-xs font-semibold transition-colors ${language === "en" ? "text-foreground" : "text-muted-foreground"}`}>EN</span>
            </div>
            {streakCount > 0 && (
              <div className="hidden sm:flex items-center gap-1 text-sm font-medium text-orange-500">
                <Flame className="h-4 w-4" />
                {t.streak(streakCount)}
              </div>
            )}
            {displayName && (
              <span className="hidden sm:block text-sm text-muted-foreground">{displayName}</span>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout} title={t.navLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="mx-auto max-w-3xl px-4 py-16 space-y-10">
        {/* 환영 메시지 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold">
            {t.welcomeBack(displayName ?? "")}
          </h1>
          <p className="text-muted-foreground">{t.welcomeSubtitle}</p>
          {streakCount > 0 && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-medium">
              <Flame className="h-4 w-4" />
              {t.streakDays(streakCount)} {t.streakLabel}
            </div>
          )}
        </div>

        {/* 빠른 이동 카드 */}
        <div className="grid sm:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className={`group h-full hover:shadow-md transition-all cursor-pointer ${link.primary ? "border-primary/50 bg-primary/5" : ""}`}>
                <CardContent className="p-5 space-y-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${link.primary ? "bg-primary/15" : "bg-muted"}`}>
                    <link.icon className={`h-5 w-5 ${link.primary ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h3 className={`font-semibold ${link.primary ? "text-primary" : ""}`}>{link.title}</h3>
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      {/* 푸터 */}
      <footer className="border-t py-8 px-4">
        <div className="mx-auto max-w-5xl text-center text-sm text-muted-foreground">
          <p>{t.footerText}</p>
        </div>
      </footer>
    </div>
  );
}

export function LandingLoggedIn({ displayName, streakCount }: Props) {
  return (
    <LanguageProvider>
      <DashboardContent displayName={displayName} streakCount={streakCount} />
    </LanguageProvider>
  );
}
