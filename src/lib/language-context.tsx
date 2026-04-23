"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { NewsCategory } from "@/types";

export type Lang = "ko" | "en";

const T = {
  ko: {
    // Navbar
    navFeed: "피드",
    navBookmarks: "북마크",
    navSettings: "설정",
    navLogout: "로그아웃",
    streak: (n: number) => `${n}일 연속`,
    streakMobile: (n: number) => `${n}일 연속 읽기 중`,

    // Feed page
    todayBriefing: "오늘의 브리핑",
    generating: "생성 중...",
    generateNow: "바로 생성",
    noBriefings: "브리핑이 없습니다",
    noBriefingsToday: "오늘의 브리핑이 아직 생성되지 않았습니다. 매일 오전 6시에 자동 생성됩니다.",
    noBriefingsDate: "이 날짜에는 브리핑이 없습니다.",
    langLabel: "언어 선택",

    // Feed detail
    backToFeed: "피드로 돌아가기",
    summaryNotFound: "요약을 찾을 수 없습니다.",
    feedbackPrompt: "이 요약이 도움이 되었나요?",
    sourceArticles: (n: number) => `원문 기사 (${n}건)`,

    // BriefingCard
    articlesAnalyzed: (n: number) => `기사 ${n}건 분석`,

    // InterestsSummary
    myInterests: "내 관심사",
    edit: "편집",
    noInterests: "저장된 관심사가 없습니다.",
    addInSettingsLink: "설정에서 추가",
    addInSettingsSuffix: "하세요.",

    // Bookmarks
    bookmarks: "북마크",
    noBookmarks: "저장한 브리핑이 없습니다",

    // Generate messages
    generateSuccess: (c: number, s: number) => `✅ 수집 ${c}건 / 브리핑 ${s}개 생성`,
    generateFailed: "생성 실패",
    noArticlesFound: "최근 관련기사를 찾을 수 없습니다.",

    // Admin
    adminDashboard: "관리자 대시보드",
    adminNav: "관리",
    adminNavDashboard: "대시보드",
    adminNavRss: "RSS 소스",
    adminNavUsers: "회원 관리",
    adminNavCategories: "카테고리 관리",
    adminActiveOf: (a: number, t: number) => `활성 ${a} / 전체 ${t}`,
    adminTotalUsers: (n: number) => `전체 회원 ${n}명`,
    adminActiveGroups: (a: number, t: number) => `활성 ${a} / 전체 ${t}개 그룹`,
    adminAddSource: "새 소스 추가",
    adminSourceName: "소스 이름",
    adminNoCategory: "카테고리 없음",
    adminPriority: "우선순위",
    adminAdd: "추가",
    adminDeleteRssConfirm: "이 RSS 소스를 삭제하시겠습니까?",
    adminDeleteGroupConfirm: "이 관심사 그룹을 삭제하시겠습니까? 관련 요약 링크도 삭제됩니다.",
    adminCategoryGroups: "카테고리 그룹",
    adminKeywordGroups: "키워드 그룹",
    adminActiveRss: (a: number, t: number) => `활성 ${a} / 전체 ${t}개 소스`,
    adminRoleLabels: { A: "관리자", T: "테스터", N: "무료", R: "유료", S: "스페셜" } as Record<string, string>,
    adminJoined: "가입",
    adminOnboarding: "온보딩 중",
    adminEmailOn: "이메일 ON",
    adminNoItems: "항목 없음",

    // Settings page
    settings: "설정",
    save: "저장",
    saving: "저장 중...",
    account: "계정",
    accountDesc: "프로필 및 알림 설정",
    name: "이름",
    email: "이메일",
    emailNotification: "이메일 브리핑 알림",
    emailNotificationDesc: "매일 아침 이메일로 브리핑을 받습니다",
    notificationTime: "알림 시간",
    interests: "관심사",
    interestsDesc: "뉴스 수집 및 요약에 사용되는 관심사 설정",
    categoriesLabel: "카테고리",

    // Onboarding components
    interestKeywordsLabel: "관심 키워드",
    keywordPlaceholder: "키워드 입력 후 Enter",
    excludeKeywordsLabel: "제외 키워드",
    excludeKeywordPlaceholder: "보고 싶지 않은 키워드",
    rssSourcesLabel: "RSS 소스 (선택)",
    sourceNamePlaceholder: "소스 이름",
    rssUrlPlaceholder: "RSS URL",

    // Landing page
    loginBtn: "로그인",
    signupBtn: "시작하기",
    heroTitle1: "매일 아침,",
    heroTitleHighlight: "나만을 위한",
    heroTitle2: "뉴스 브리핑",
    heroDesc: "관심사를 설정하면 AI가 매일 관련 뉴스를 수집하고 핵심을 분석·요약합니다. 하루 5분이면 오늘의 이슈를 완벽하게 파악할 수 있습니다.",
    startFree: "무료로 시작하기",
    howItWorks: "어떻게 작동하나요?",
    feature1Title: "1. 관심사 설정",
    feature1Desc: "카테고리, 키워드, RSS 소스를 자유롭게 설정하세요. 제외 키워드로 노이즈도 필터링합니다.",
    feature2Title: "2. 자동 수집·분석",
    feature2Desc: "매일 새벽 AI가 관련 뉴스를 수집하고 배경·원인·시사점을 포함한 1,500자 분석 요약을 생성합니다.",
    feature3Title: "3. 아침 브리핑",
    feature3Desc: "웹 피드와 이메일로 오늘의 브리핑을 받아보세요. 5분이면 핵심 이슈를 파악합니다.",
    footerText: "InfoB © 2026. AI 기반 뉴스 큐레이션 서비스.",

    // Logged-in home
    welcomeBack: (name: string) => `안녕하세요, ${name || "사용자"}님!`,
    welcomeSubtitle: "오늘도 중요한 뉴스를 놓치지 마세요.",
    goToFeed: "오늘의 브리핑 보기",
    goToFeedDesc: "AI가 선별한 오늘의 뉴스 브리핑",
    goToBookmarks: "북마크",
    goToBookmarksDesc: "저장해둔 브리핑 다시 읽기",
    goToSettingsDesc: "관심사, 알림 등 개인화 설정",
    streakLabel: "연속 읽기",
    streakDays: (n: number) => `${n}일`,

    // Section labels
    categories: "카테고리",
    interestKeywords: "관심 키워드",
    excludeKeywords: "제외 키워드",

    // Category labels
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
    // Navbar
    navFeed: "Feed",
    navBookmarks: "Bookmarks",
    navSettings: "Settings",
    navLogout: "Log out",
    streak: (n: number) => `${n} day streak`,
    streakMobile: (n: number) => `${n} day reading streak`,

    // Feed page
    todayBriefing: "Today's Briefing",
    generating: "Generating...",
    generateNow: "Generate Now",
    noBriefings: "No briefings",
    noBriefingsToday: "Today's briefing hasn't been generated yet. It's generated automatically at 6 AM daily.",
    noBriefingsDate: "No briefing for this date.",
    langLabel: "Select language",

    // Feed detail
    backToFeed: "Back to Feed",
    summaryNotFound: "Summary not found.",
    feedbackPrompt: "Was this summary helpful?",
    sourceArticles: (n: number) => `Source Articles (${n})`,

    // BriefingCard
    articlesAnalyzed: (n: number) => `${n} articles analyzed`,

    // InterestsSummary
    myInterests: "My Interests",
    edit: "Edit",
    noInterests: "No saved interests.",
    addInSettingsLink: "Add in settings",
    addInSettingsSuffix: ".",

    // Bookmarks
    bookmarks: "Bookmarks",
    noBookmarks: "No saved briefings",

    // Generate messages
    generateSuccess: (c: number, s: number) => `✅ Collected ${c} / Generated ${s} briefings`,
    generateFailed: "Generation failed",
    noArticlesFound: "No recent articles found.",

    // Admin
    adminDashboard: "Admin Dashboard",
    adminNav: "Admin",
    adminNavDashboard: "Dashboard",
    adminNavRss: "RSS Sources",
    adminNavUsers: "Users",
    adminNavCategories: "Categories",
    adminActiveOf: (a: number, t: number) => `${a} active / ${t} total`,
    adminTotalUsers: (n: number) => `${n} total users`,
    adminActiveGroups: (a: number, t: number) => `${a} active / ${t} total interest groups`,
    adminAddSource: "Add New Source",
    adminSourceName: "Source name",
    adminNoCategory: "No category",
    adminPriority: "Priority",
    adminAdd: "Add",
    adminDeleteRssConfirm: "Delete this RSS source?",
    adminDeleteGroupConfirm: "Delete this interest group? This will remove related summary links.",
    adminCategoryGroups: "Category Groups",
    adminKeywordGroups: "Keyword Groups",
    adminActiveRss: (a: number, t: number) => `${a} active / ${t} total sources`,
    adminRoleLabels: { A: "Admin", T: "Tester", N: "Free", R: "Paid", S: "Special" } as Record<string, string>,
    adminJoined: "Joined",
    adminOnboarding: "Onboarding",
    adminEmailOn: "Email ON",
    adminNoItems: "No items",

    // Settings page
    settings: "Settings",
    save: "Save",
    saving: "Saving...",
    account: "Account",
    accountDesc: "Profile & notification settings",
    name: "Name",
    email: "Email",
    emailNotification: "Email Briefing Notifications",
    emailNotificationDesc: "Receive briefings by email every morning",
    notificationTime: "Notification Time",
    interests: "Interests",
    interestsDesc: "Configure interests used for news collection & summarization",
    categoriesLabel: "Categories",

    // Onboarding components
    interestKeywordsLabel: "Interest Keywords",
    keywordPlaceholder: "Type keyword and press Enter",
    excludeKeywordsLabel: "Exclude Keywords",
    excludeKeywordPlaceholder: "Keywords to filter out",
    rssSourcesLabel: "RSS Sources (Optional)",
    sourceNamePlaceholder: "Source name",
    rssUrlPlaceholder: "RSS URL",

    // Landing page
    loginBtn: "Log In",
    signupBtn: "Get Started",
    heroTitle1: "Every Morning,",
    heroTitleHighlight: "Your Personalized",
    heroTitle2: "News Briefing",
    heroDesc: "Set your interests and AI collects relevant news daily, analyzing and summarizing key points. Stay fully informed in just 5 minutes.",
    startFree: "Get Started Free",
    howItWorks: "How It Works",
    feature1Title: "1. Set Your Interests",
    feature1Desc: "Choose categories, keywords, and RSS sources. Use exclude keywords to filter out noise.",
    feature2Title: "2. Auto Collection & Analysis",
    feature2Desc: "AI collects related news daily and generates 1,500-character summaries including background, causes, and key insights.",
    feature3Title: "3. Morning Briefing",
    feature3Desc: "Receive your daily briefing via web feed and email. Grasp today's key issues in just 5 minutes.",
    footerText: "InfoB © 2026. AI-powered news curation service.",

    // Logged-in home
    welcomeBack: (name: string) => `Welcome back, ${name || "there"}!`,
    welcomeSubtitle: "Don't miss today's important news.",
    goToFeed: "Today's Briefing",
    goToFeedDesc: "AI-curated news briefings for today",
    goToBookmarks: "Bookmarks",
    goToBookmarksDesc: "Revisit your saved briefings",
    goToSettingsDesc: "Personalize interests, notifications & more",
    streakLabel: "Day Streak",
    streakDays: (n: number) => `${n}`,

    // Section labels
    categories: "Categories",
    interestKeywords: "Interest Keywords",
    excludeKeywords: "Exclude Keywords",

    // Category labels
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
};

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
    return { language: "en" as Lang, setLanguage: () => {}, t: T.en };
  }
  return ctx;
}
