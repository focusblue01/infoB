import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Newspaper, Sparkles, Clock, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="border-b">
        <div className="mx-auto max-w-5xl flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Newspaper className="h-5 w-5 text-primary" />
            Daily News Digest
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">로그인</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">시작하기</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 히어로 */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            매일 아침,{" "}
            <span className="text-primary">나만을 위한</span>{" "}
            뉴스 브리핑
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            관심사를 설정하면 AI가 매일 관련 뉴스를 수집하고 핵심을 분석·요약합니다.
            하루 5분이면 오늘의 이슈를 완벽하게 파악할 수 있습니다.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                <Sparkles className="h-4 w-4" />
                무료로 시작하기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-center mb-12">어떻게 작동하나요?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: "1. 관심사 설정",
                desc: "카테고리, 키워드, RSS 소스를 자유롭게 설정하세요. 제외 키워드로 노이즈도 필터링합니다.",
              },
              {
                icon: Clock,
                title: "2. 자동 수집·분석",
                desc: "매일 새벽 AI가 관련 뉴스를 수집하고 배경·원인·시사점을 포함한 1,500자 분석 요약을 생성합니다.",
              },
              {
                icon: Mail,
                title: "3. 아침 브리핑",
                desc: "웹 피드와 이메일로 오늘의 브리핑을 받아보세요. 5분이면 핵심 이슈를 파악합니다.",
              },
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
          <p>Daily News Digest &copy; 2026. AI 기반 뉴스 큐레이션 서비스.</p>
        </div>
      </footer>
    </div>
  );
}
