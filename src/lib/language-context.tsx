"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { NewsCategory } from "@/types";

export type Lang = "ko" | "en";

const T = {
  ko: {
    navFeed: "피드",
    navBookmarks: "북마크",
    navSettings: "설정",
    navLogout: "로그아웃",
    streak: (n: number) => `${n}일 연속`,
    streakMobile: (n: number) => `${n}일 연속 읽기 중`,
    todayBriefing: "오늘의 브리핑",
    generating: "생성 중...",
    generateNow: "바로 생성",
    noBriefings: "브리핑이 없습니다",
    noBriefingsToday: "오늘의 브리핑이 아직 생성되지 않았습니다. 매일 오전 6시에 자동 생성됩니다.",
    noBriefingsDate: "이 날짜에는 브리핑이 없습니다.",
    langLabel: "언어 선택",
    backToFeed: "피드로 돌아가기",
    summaryNotFound: "요약을 찾을 수 없습니다.",
    feedbackPrompt: "이 요약이 도움이 되었나요?",
    sourceArticles: (n: number) => `원문 기사 (${n}건)`,
    articlesAnalyzed: (n: number) => `기사 ${n}건 분석`,
    myInterests: "내 관심사",
    edit: "편집",
    noInterests: "저장된 관심사가 없습니다.",
    addInSettings: "설정에서 추가하세요.",
    addInSettingsLink: "설정에서 추가",
    addInSettingsSuffix: "하세요.",
    categories: "카테고리",
    interestKeywords: "관심 키워드",
    excludeKeywords: "제외 키워드",
    bookmarks: "북마크",
    noBookmarks: "저장한 브리핑이 없습니다",
    generateSuccess: (c: number, s: number) => `✅ 수집 ${c}건 / 브리핑 ${s}개 생성`,
    generateFailed: "생성 실패",
    categoryLabels: {
      technology: "IT/기술",
      economy: "경제/금융",
      politics: "정치",
      society: "사회",
      culture: "문화",
      sports: "스포츠",
      science: "과학",
      global: "글로벌",
    } as Record<NewsCategory, string>,
  },
  en: {
    navFeed: "Feed",
    navBookmarks: "Bookmarks",
    navSettings: "Settings",
    navLogout: "Log out",
    streak: (n: number) => `${n} day streak`,
    streakMobile: (n: number) => `${n} day reading streak`,
    todayBriefing: "Today's Briefing",
    generating: "Generating...",
    generateNow: "Generate Now",
    noBriefings: "No briefings",
    noBriefingsToday: "Today's briefing hasn't been generated yet. It's generated automatically at 6 AM daily.",
    noBriefingsDate: "No briefing for this date.",
    langLabel: "Select language",
    backToFeed: "Back to Feed",
    summaryNotFound: "Summary not found.",
    feedbackPrompt: "Was this summary helpful?",
    sourceArticles: (n: number) => `Source Articles (${n})`,
    articlesAnalyzed: (n: number) => `${n} articles analyzed`,
    myInterests: "My Interests",
    edit: "Edit",
    noInterests: "No saved interests.",
    addInSettings: "Add in settings.",
    addInSettingsLink: "Add in settings",
    addInSettingsSuffix: ".",
    categories: "Categories",
    interestKeywords: "Interest Keywords",
    excludeKeywords: "Exclude Keywords",
    bookmarks: "Bookmarks",
    noBookmarks: "No saved briefings",
    generateSuccess: (c: number, s: number) => `✅ Collected ${c} / Generated ${s} briefings`,
    generateFailed: "Generation failed",
    categoryLabels: {
      technology: "IT/Tech",
      economy: "Economy",
      politics: "Politics",
      society: "Society",
      culture: "Culture",
      sports: "Sports",
      science: "Science",
      global: "Global",
    } as Record<NewsCategory, string>,
  },
} as const;

type Translations = typeof T.ko;

interface LanguageContextValue {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("briefing_lang") as Lang | null;
    if (saved === "ko" || saved === "en") setLang(saved);
  }, []);

  function setLanguage(lang: Lang) {
    setLang(lang);
    localStorage.setItem("briefing_lang", lang);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: T[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // fallback for components outside provider (e.g. onboarding)
    return { language: "en" as Lang, setLanguage: () => {}, t: T.en };
  }
  return ctx;
}
