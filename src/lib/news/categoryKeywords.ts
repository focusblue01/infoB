import type { NewsCategory } from "@/types";

// ──────────────────────────────────────────────────────────────────
// 보편 규칙 (모든 카테고리 동일 적용)
//   - 한글 토큰: 길이 ≥ 2, substring 매칭
//   - 영문/숫자 토큰: \b 단어경계 매칭(짧은 영문 약어가 임의 위치에 매칭되는 노이즈 방지)
//   - 토큰별 weight (1=약, 2=보통, 3=강)
//   - 합산 점수 < MIN_SCORE → 분류 안 함
//   - 1위 ‒ 2위 점수차 < MIN_MARGIN → 모호로 판정해 분류 안 함
//
// 카테고리 사이 분류는 사전 경쟁만으로 결정한다. 부정 키워드(blacklist) 같은
// 케이스별 하드코딩은 두지 않고, 사전을 풍부하게 채우는 방식으로 정확도를 올린다.
// ──────────────────────────────────────────────────────────────────

type Token = string | [string, number];

function isAsciiToken(t: string): boolean {
  return /^[a-z0-9][a-z0-9\s\-]*$/i.test(t);
}

const RAW: Record<NewsCategory, Token[]> = {
  technology: [
    ["AI", 3], "인공지능", "반도체", "소프트웨어", "스마트폰", "스타트업",
    "클라우드", "데이터센터", "사이버보안", "해킹", "딥러닝", "머신러닝",
    "로봇공학", "생성형", "양자컴퓨터", "5G", "메타버스", "블록체인",
    ["chip", 2], ["startup", 2], ["software", 2], ["cloud", 2],
    ["semiconductor", 2], ["machine learning", 2], ["deep learning", 2],
    ["robotics", 2], ["LLM", 3], ["GPU", 3],
  ],
  economy: [
    // 거시/금융
    "경제", "금융", "주식", "증시", "코스피", "코스닥", "환율", "금리",
    "물가", "부동산", "투자", "기업", "실적", "영업이익", "영업손실",
    "분기실적", ["GDP", 3], "무역", "수출", "수입", "관세", "원화",
    "달러", "외환", "채권", "펀드", ["IPO", 3], "공모주", "상장",
    "경기침체", "경기둔화", "반등", "회복세",
    // 산업/기업 (연합뉴스 산업 RSS 가 economy 로 이동했으므로 보강)
    "제조", "조선", "철강", "화학", "정유", "통신", "물류", "조선업",
    "산업", "공장", "생산", "수주", "납품", "공급망",
    // 유통/소비재 (이마트류 보강)
    "이마트", "롯데마트", "홈플러스", "코스트코", "대형마트", "백화점",
    "편의점", "유통", "할인행사", "할인", "페스타", "세일", "프로모션",
    "신선식품", "가전행사", "신상품", "회원가", "장바구니", "마트",
    "쇼핑몰", "이커머스", "오픈런", "매출",
    // 영문
    ["economy", 2], ["financial", 2], ["stock", 2], ["market", 2],
    ["kospi", 3], ["fed", 3], ["inflation", 2], ["tariff", 2],
    ["investment", 2], ["earnings", 2], ["revenue", 2],
  ],
  politics: [
    "정치", "대통령", "국회", "여당", "야당", "선거", "외교", "북한",
    "법안", "총선", "대선", "국정감사", "청와대", "정당", "탄핵",
    "민주당", "국민의힘", "공천", "본회의", "장관", "총리",
    ["politics", 2], ["election", 2], ["congress", 2], ["parliament", 2],
    ["diplomacy", 2], ["president", 2], ["senate", 2], ["impeachment", 2],
  ],
  society: [
    "사회", "사건", "사고", "범죄", "재난", "교육", "노동", "복지", "주거",
    "치안", "화재", "지진", "태풍", "폭우", "교통사고", "검찰", "경찰",
    "구속", "수사", "체포", "징역",
    ["crime", 2], ["disaster", 2], ["education", 2], ["wildfire", 2],
    ["earthquake", 2], ["typhoon", 2], ["arrest", 2],
  ],
  culture: [
    "문화", "예술", "공연", "전시", "영화", "드라마", "음악", "K-팝",
    "케이팝", "BTS", "한류", "도서", "연예", "콘서트", "OST",
    "박스오피스", "넷플릭스", "박물관", "미술관", "공모전",
    ["culture", 2], ["exhibition", 2], ["movie", 2], ["film", 2],
    ["drama", 2], ["k-pop", 3], ["kpop", 3], ["entertainment", 2],
    ["museum", 2], ["concert", 2],
  ],
  sports: [
    "스포츠", "축구", "야구", "농구", "골프", "테니스", "배구", "올림픽",
    "월드컵", "프로야구", ["K리그", 3], "리그", "감독", "구단", "선수단",
    "결승", "준결승",
    ["MLB", 3], ["NBA", 3], ["KBO", 3], ["soccer", 2], ["football", 2],
    ["baseball", 2], ["basketball", 2], ["golf", 2], ["tennis", 2],
    ["olympics", 3], ["world cup", 3], ["premier league", 3],
  ],
  science: [
    "과학", "연구", "논문", "우주", "항공우주", "생명공학", "의학",
    "백신", "바이러스", "기후", "환경", "탄소중립", "신약", "임상시험",
    "위성", "탐사선", "유전자", "DNA", "팬데믹", "건강",
    ["NASA", 3], ["science", 2], ["research", 2], ["space", 2],
    ["biology", 2], ["medical", 2], ["vaccine", 2], ["climate", 2],
    ["genome", 2],
  ],
  global: [
    "국제", "세계", "미국", "중국", "일본", "유럽", "러시아", "우크라이나",
    "중동", "이스라엘", "팔레스타인", "유엔", "나토", "EU", "G7", "G20",
    "백악관", "크렘린", "워싱턴", "베이징", "도쿄",
    ["global", 2], ["international", 2], ["china", 2], ["japan", 2],
    ["europe", 2], ["russia", 2], ["ukraine", 2], ["israel", 2],
    ["nato", 3], ["white house", 3], ["kremlin", 3],
  ],
};

interface CompiledRule {
  token: string;
  weight: number;
  ascii: boolean;
}

interface CompiledCategory {
  category: NewsCategory;
  rules: CompiledRule[];
}

const COMPILED: CompiledCategory[] = (
  Object.entries(RAW) as Array<[NewsCategory, Token[]]>
).map(([category, tokens]) => ({
  category,
  rules: tokens.map((t): CompiledRule => {
    const [token, weight] = Array.isArray(t) ? t : [t, 2];
    return {
      token: token.toLowerCase(),
      weight,
      ascii: isAsciiToken(token),
    };
  }),
}));

// 단어 경계 매칭용 정규식 캐시
const REGEX_CACHE = new Map<string, RegExp>();
function getAsciiRegex(token: string): RegExp {
  let r = REGEX_CACHE.get(token);
  if (!r) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    r = new RegExp(`\\b${escaped}\\b`, "i");
    REGEX_CACHE.set(token, r);
  }
  return r;
}

const MIN_SCORE = 2;
const MIN_MARGIN = 1;

/**
 * 모든 카테고리에 대해 텍스트 점수를 계산한다.
 */
export function scoreCategories(text: string): Record<NewsCategory, number> {
  const lower = text.toLowerCase();
  const out: Partial<Record<NewsCategory, number>> = {};

  for (const { category, rules } of COMPILED) {
    let score = 0;
    for (const r of rules) {
      if (r.ascii) {
        if (getAsciiRegex(r.token).test(lower)) score += r.weight;
      } else {
        if (r.token.length < 2) continue;
        if (lower.includes(r.token)) score += r.weight;
      }
    }
    out[category] = score;
  }
  return out as Record<NewsCategory, number>;
}

/**
 * 점수 경쟁으로 1위 카테고리 결정.
 * - 1위 점수 < MIN_SCORE → null
 * - 1위 ‒ 2위 < MIN_MARGIN → 모호 → null
 */
export function inferCategory(text: string): NewsCategory | null {
  const scores = scoreCategories(text);
  const ranked = (Object.entries(scores) as Array<[NewsCategory, number]>)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);

  if (ranked.length === 0) return null;
  if (ranked[0][1] < MIN_SCORE) return null;
  if (ranked.length >= 2 && ranked[0][1] - ranked[1][1] < MIN_MARGIN) return null;
  return ranked[0][0];
}

// 외부에서 임계치 정책을 동일하게 사용할 수 있도록 노출
export const CLASSIFICATION_THRESHOLDS = {
  MIN_SCORE,
  MIN_MARGIN,
  /** 기존에 카테고리가 지정되어 있을 때, 다른 카테고리로 override 하기 위한 강한 신뢰 점수 */
  STRONG_OVERRIDE_SCORE: 4,
};

/**
 * 영문/숫자 키워드는 \b 단어경계, 한글 키워드는 substring 으로 매칭.
 * collector 의 matched_keywords 부착에서 사용.
 */
export function keywordMatches(text: string, keyword: string): boolean {
  const lower = keyword.toLowerCase();
  if (isAsciiToken(keyword)) {
    return getAsciiRegex(lower).test(text);
  }
  if (lower.length < 2) return false;
  return text.toLowerCase().includes(lower);
}
