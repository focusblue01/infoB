"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategorySelector } from "@/components/onboarding/CategorySelector";
import { KeywordInput } from "@/components/onboarding/KeywordInput";
import { RssSourceInput } from "@/components/onboarding/RssSourceInput";
import type { NewsCategory } from "@/types";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([]);
  const [rssSources, setRssSources] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleComplete() {
    setLoading(true);
    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, keywords, excludeKeywords, rssSources }),
      });
      if (!res.ok) throw new Error("저장 실패");
      router.push("/feed");
      router.refresh();
    } catch {
      alert("관심사 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    {
      title: "관심 카테고리를 선택하세요",
      desc: "관심 있는 뉴스 분야를 1개 이상 선택해주세요.",
      content: <CategorySelector selected={categories} onChange={setCategories} />,
      valid: categories.length > 0,
    },
    {
      title: "관심 키워드를 추가하세요",
      desc: "구체적인 관심사를 키워드로 입력하세요. (예: AI, 반도체, 테슬라)",
      content: (
        <div className="space-y-6">
          <KeywordInput
            keywords={keywords}
            onChange={setKeywords}
            label="관심 키워드"
            placeholder="관심 키워드 입력 후 Enter"
          />
          <KeywordInput
            keywords={excludeKeywords}
            onChange={setExcludeKeywords}
            label="제외 키워드"
            placeholder="보고 싶지 않은 키워드 입력 후 Enter"
            variant="exclude"
          />
        </div>
      ),
      valid: true, // 키워드는 선택사항
    },
    {
      title: "RSS 소스 추가 (선택)",
      desc: "직접 추가하고 싶은 뉴스 소스의 RSS URL을 입력하세요.",
      content: <RssSourceInput sources={rssSources} onChange={setRssSources} />,
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
              <ArrowLeft className="h-4 w-4" /> 이전
            </Button>
            {step < steps.length - 1 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!current.valid}
                className="gap-1"
              >
                다음 <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={loading || categories.length === 0} className="gap-1">
                {loading ? "저장 중..." : (
                  <>완료 <Check className="h-4 w-4" /></>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
