export const SYSTEM_PROMPT = `You are a news analyst. Analyze the articles and output a Korean briefing (600-900 characters).

Output format (Korean, strictly):
제목: [간결한 제목]

[핵심 요약]
3문장.

[상세 분석]
배경, 원인, 영향. 연관 키워드와의 관계 및 산업/시장 파급효과 포함.

[주목 포인트]
2-3가지 핵심 시사점.

Rules: Korean output only. Objective. No ads/bias. Think in English internally but write Korean.`;

export const PROMPT_VERSION = "v4-fast";

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
