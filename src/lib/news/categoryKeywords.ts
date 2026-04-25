import type { NewsCategory } from "@/types";

// 카테고리별 키워드 사전 (한/영) — 기사 제목/요약 텍스트 매칭용
// 카테고리 분류가 없는 기사(RSS, 키워드 검색 등)에 보조적으로 카테고리를 부여해
// 카테고리 브리핑의 기사 풀과 연관성을 약간 더 끌어올린다.
export const CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  technology: [
    "AI", "인공지능", "반도체", "IT", "소프트웨어", "스마트폰", "앱", "스타트업",
    "클라우드", "데이터센터", "사이버", "해킹", "딥러닝", "머신러닝", "로봇",
    "tech", "technology", "software", "semiconductor", "chip", "startup",
    "cloud", "cyber", "hacking", "machine learning", "deep learning", "robot",
  ],
  economy: [
    "경제", "금융", "주식", "증시", "코스피", "코스닥", "환율", "금리", "물가",
    "부동산", "투자", "기업", "실적", "GDP", "무역", "수출", "수입", "관세",
    "economy", "financial", "stock", "market", "kospi", "fed", "interest rate",
    "inflation", "trade", "tariff", "investment", "earnings", "ipo",
  ],
  politics: [
    "정치", "대통령", "국회", "여당", "야당", "선거", "외교", "북한", "법안",
    "총선", "대선", "국정감사", "청와대", "정당",
    "politics", "election", "congress", "parliament", "diplomacy", "policy",
    "government", "president", "senate",
  ],
  society: [
    "사회", "사건", "사고", "범죄", "재난", "교육", "노동", "복지", "주거",
    "치안", "화재", "지진", "태풍", "교통",
    "society", "social", "crime", "disaster", "education", "labor", "welfare",
    "accident", "wildfire", "earthquake", "typhoon",
  ],
  culture: [
    "문화", "예술", "공연", "전시", "영화", "드라마", "음악", "K-팝", "케이팝",
    "방탄소년단", "BTS", "한류", "도서", "책", "연예",
    "culture", "art", "exhibition", "movie", "film", "drama", "music",
    "k-pop", "kpop", "entertainment", "celebrity",
  ],
  sports: [
    "스포츠", "축구", "야구", "농구", "골프", "테니스", "배구", "올림픽",
    "월드컵", "프로야구", "K리그", "MLB", "NBA",
    "sports", "soccer", "football", "baseball", "basketball", "golf", "tennis",
    "olympics", "world cup", "premier league",
  ],
  science: [
    "과학", "연구", "논문", "우주", "항공", "생명공학", "의학", "백신", "바이러스",
    "기후", "환경", "탄소", "신약", "건강",
    "science", "research", "study", "space", "nasa", "biology", "medical",
    "vaccine", "virus", "climate", "carbon", "health",
  ],
  global: [
    "국제", "세계", "미국", "중국", "일본", "유럽", "러시아", "우크라이나",
    "중동", "이스라엘", "팔레스타인", "유엔", "나토",
    "global", "world", "international", "us", "china", "japan", "europe",
    "russia", "ukraine", "middle east", "israel", "un", "nato",
  ],
};

const COMPILED: Array<{ category: NewsCategory; matchers: string[] }> = (
  Object.entries(CATEGORY_KEYWORDS) as Array<[NewsCategory, string[]]>
).map(([category, kws]) => ({
  category,
  matchers: kws.map((k) => k.toLowerCase()),
}));

/**
 * 텍스트(title + description)에 가장 많이 매칭되는 카테고리를 반환.
 * 매칭이 1건도 없거나 모두 동률이면 null.
 */
export function inferCategory(text: string): NewsCategory | null {
  const lower = text.toLowerCase();
  let best: { category: NewsCategory; score: number } | null = null;

  for (const { category, matchers } of COMPILED) {
    let score = 0;
    for (const m of matchers) {
      if (m.length < 2) continue;
      if (lower.includes(m)) score++;
    }
    if (score === 0) continue;
    if (!best || score > best.score) {
      best = { category, score };
    }
  }

  // 최소 1건 매칭만 있어도 반환 (보조 분류)
  return best?.category ?? null;
}
