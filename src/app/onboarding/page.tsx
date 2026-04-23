"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategorySelector } from "@/components/onboarding/CategorySelector";
import { KeywordInput } from "@/components/onboarding/KeywordInput";
import { RssSourceInput } from "@/components/onboarding/RssSourceInput";
import type { NewsCategory, UserRole } from "@/types";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { canUseKeywords, canUseRss, maxCategories, maxKeywords } from "@/lib/permissions";

function OnboardingContent() {
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([]);
  const [rssSources, setRssSources] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>("N");
  const router = useRouter();
  const { t, language } = useLanguage();
  const isKo = language === "ko";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data }) => {
        if (data?.role) setRole(data.role as UserRole);
      });
    });
  }, []);

  const keywordsEnabled = canUseKeywords(role);
  const rssEnabled = canUseRss(role);
  const catLimit = maxCategories(role);
  const kwLimit = maxKeywords(role);

  async function handleComplete() {
    setLoading(true);
    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, keywords, excludeKeywords, rssSources }),
      });
      if (!res.ok) throw new Error("Failed to save");
      router.push("/feed");
      router.refresh();
    } catch {
      alert("Failed to save interests. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    {
      title: isKo ? "관심 카테고리를 선택하세요" : "Select Your Interests",
      desc: isKo
        ? "관심 있는 뉴스 분야를 1개 이상 선택해주세요."
        : "Choose at least one news category you're interested in.",
      content: <CategorySelector selected={categories} onChange={setCategories} maxSelect={catLimit} />,
      valid: categories.length > 0,
    },
    ...(keywordsEnabled ? [{
      title: isKo ? "관심 키워드를 추가하세요" : "Add Keywords",
      desc: isKo
        ? "구체적인 관심사를 키워드로 입력하세요. (예: AI, 반도체, 테슬라)"
        : "Enter specific topics as keywords. (e.g. AI, semiconductors, Tesla)",
      content: (
        <div className="space-y-6">
          <KeywordInput keywords={keywords} onChange={setKeywords} maxKeywords={kwLimit} />
          <KeywordInput keywords={excludeKeywords} onChange={setExcludeKeywords} variant="exclude" maxKeywords={kwLimit} />
        </div>
      ),
      valid: true,
    }] : []),
    {
      title: isKo ? "RSS 소스 추가 (선택)" : "Add RSS Sources (Optional)",
      desc: isKo
        ? "직접 추가하고 싶은 뉴스 소스의 RSS URL을 입력하세요."
        : "Enter the RSS URL of any news source you'd like to add.",
      content: <RssSourceInput sources={rssSources} onChange={setRssSources} disabled={!rssEnabled} />,
      valid: true,
    },
  ];

  const current = steps[step];

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <CardTitle>{current.title}</CardTitle>
          <CardDescription>{current.desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {current.content}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              {isKo ? "이전" : "Back"}
            </Button>
            {step < steps.length - 1 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!current.valid}
                className="gap-1"
              >
                {isKo ? "다음" : "Next"} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={loading || categories.length === 0} className="gap-1">
                {loading
                  ? (isKo ? "저장 중..." : "Saving...")
                  : <>{isKo ? "완료" : "Finish"} <Check className="h-4 w-4" /></>
                }
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <LanguageProvider>
      <OnboardingContent />
    </LanguageProvider>
  );
}
