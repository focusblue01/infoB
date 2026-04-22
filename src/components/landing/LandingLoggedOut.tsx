"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Newspaper, Sparkles, Clock, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LanguageProvider, useLanguage } from "@/lib/language-context";

function LandingContent() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="border-b">
        <div className="mx-auto max-w-5xl flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Newspaper className="h-5 w-5 text-primary" />
            InfoB
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
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">{t.loginBtn}</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">{t.signupBtn}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 히어로 */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            {t.heroTitle1}{" "}
            <span className="text-primary">{t.heroTitleHighlight}</span>{" "}
            {t.heroTitle2}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t.heroDesc}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                <Sparkles className="h-4 w-4" />
                {t.startFree}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-center mb-12">{t.howItWorks}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Sparkles, title: t.feature1Title, desc: t.feature1Desc },
              { icon: Clock,    title: t.feature2Title, desc: t.feature2Desc },
              { icon: Mail,     title: t.feature3Title, desc: t.feature3Desc },
            ].map((feature) => (
              <div key={feature.title} className="text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t py-8 px-4">
        <div className="mx-auto max-w-5xl text-center text-sm text-muted-foreground">
          <p>{t.footerText}</p>
        </div>
      </footer>
    </div>
  );
}

export function LandingLoggedOut() {
  return (
    <LanguageProvider>
      <LandingContent />
    </LanguageProvider>
  );
}
