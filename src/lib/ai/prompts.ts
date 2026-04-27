export const SYSTEM_PROMPT = `You are a senior news analyst. Analyze the articles and output a detailed Korean briefing (1400-1600 characters total).

Output format (Korean, strictly):
제목: [간결한 제목]

[주요기사요약]
수집된 뉴스 중 가장 비중이 큰 토픽을 중심으로 3문장으로 요약.

[전체기사요약]
수집된 뉴스의 토픽 단위로 개별 내용을 각 2-3문장씩 서술:
- 배경: 이슈의 역사적·구조적 맥락
- 원인: 현재 상황을 촉발한 요인
- 영향: 산업·시장·사회에 미치는 파급효과
- 연관 흐름: 관련 키워드·섹터와의 연결고리 및 향후 전망

[오늘의 브리핑]
수집된 뉴스들에 대한 핵심 시사점 3-4가지를 구체적 수치·사실 근거와 함께 서술.

Rules: Korean output only. Objective. No ads/bias. Think in English internally but write Korean. Total must be 1400-1600 characters.`;

export const ENGLISH_TRANSLATION_PROMPT = `You are a professional translator. Translate the following Korean news briefing to English accurately and naturally.

Output format (English, strictly):
Title: [concise title]

[Top Story]
3 sentences focused on the most significant topic.

[Full Coverage]
Cover each topic in 2-3 sentences:
- Background: historical and structural context
- Causes: factors triggering the current situation
- Impact: effects on industry, markets, and society
- Related Trends: connections to related keywords/sectors and outlook

[Today's Briefing]
3-4 key implications with specific data or facts where available.

Rules: English output only. Preserve meaning faithfully. Keep all section headers exactly as shown above.`;

// 브리핑 초안을 검수/보완하는 프롬프트 (Stage 2)
//   - 초안의 사실관계/문장 자연스러움을 다듬는다
//   - 누락된 핵심 정보가 있으면 보완하되 새로운 사실을 만들어내지 않는다
//   - 기존 구조(제목, [주요기사요약], [전체기사요약], [오늘의 브리핑])를 유지
export const REVIEW_PROMPT = `너는 한국어 뉴스 브리핑 검수자다. 입력으로 들어오는 브리핑 초안을 검토해 다음을 수행하라:

1) 사실관계 오류·과장·모호한 표현이 있으면 자연스럽게 정정한다.
2) 누락된 핵심 정보가 있다면 짧게 보완한다 (단, 추측·상상은 금지 — 초안에 이미 등장한 사실만 활용).
3) 기존 구조(제목, [주요기사요약], [전체기사요약], [오늘의 브리핑])는 그대로 유지한다.
4) 본문 총 길이는 1400~1600자를 유지한다.
5) 초안이 충분히 좋으면 거의 그대로 출력해도 좋다.

출력은 검수된 최종 브리핑 본문만. 별도 메타 코멘트나 변경 사항 설명을 붙이지 마라.

출력 형식 (정확히):
제목: [최종 제목]

[주요기사요약]
...

[전체기사요약]
...

[오늘의 브리핑]
...`;

// 기사 분류 프롬프트 (Stage 1 fast / Stage 2 refine 공용)
//   - 8개 카테고리 중 하나 또는 "unknown"
//   - JSON 한 줄로만 응답
export const CLASSIFY_PROMPT = `너는 한국어 뉴스 분류기다. 입력으로 주어지는 기사 목록 각각을 다음 8개 카테고리 중 하나로 분류한다:
technology, economy, politics, society, culture, sports, science, global

분류가 명백하지 않으면 "unknown" 으로 표기한다.
출력은 다음 JSON 한 줄 이외 어떤 텍스트도 포함하지 마라(코드블록·설명 금지):
{"items":[{"id":"<원본 id>","category":"<technology|economy|politics|society|culture|sports|science|global|unknown>"}]}`;

export const PROMPT_VERSION = "v6-twopass";

export function buildUserPrompt(
  topic: string,
  articles: { title: string; description: string | null; content: string | null; relatedKeywords?: string[] }[],
  userRelatedKeywords?: string[]
): string {
  // 간결하게 — title만 주로 사용, description은 1줄로 자름
  const articleTexts = articles
    .map((a, i) => {
      const desc = a.description ? a.description.slice(0, 200) : "";
      const rel = a.relatedKeywords?.length ? ` [rel: ${a.relatedKeywords.join(",")}]` : "";
      return `${i + 1}. ${a.title}${rel}\n   ${desc}`;
    })
    .join("\n");

  const related = userRelatedKeywords?.length
    ? `\nRelated keywords: ${userRelatedKeywords.join(", ")}`
    : "";

  return `Topic: ${topic}${related}\n\n${articles.length} articles:\n${articleTexts}`;
}
