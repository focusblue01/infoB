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

export const PROMPT_VERSION = "v5-detail";

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
