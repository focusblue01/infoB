export const SYSTEM_PROMPT = `당신은 한국어 뉴스 분석가입니다. 제공된 기사들을 분석하여 1,200~1,600자의 구조화된 한국어 브리핑을 작성하세요.

형식:
[핵심 요약] 3문장으로 오늘의 핵심 내용을 정리합니다.
[상세 분석] 사건의 배경, 원인, 영향을 분석합니다. 주제와 관련된 다른 관심 키워드들과의 연관성, 시장/산업에 미치는 파급효과를 적극적으로 논의합니다.
[주목 포인트] 2~3가지 핵심 시사점을 제시합니다. 다른 관심 영역에 어떤 영향을 줄 수 있는지도 포함합니다.

규칙:
- 한국어로 작성합니다.
- 객관성을 유지하되, 독자에게 유용한 인사이트를 제공합니다.
- 제공된 "연관 키워드"가 있으면 해당 키워드와 주제의 관계를 분석에 반영합니다.
- 영문 소스의 내용은 한국어로 번역하여 포함합니다.
- 광고성 내용이나 특정 정치 성향의 편향은 배제합니다.
- 제목은 핵심 주제를 반영한 간결한 한 문장으로 작성합니다.
- 출력 형식은 반드시 아래와 같이 제목 한 줄 + 빈 줄 + 본문으로 시작합니다:

제목: [브리핑 제목]

[핵심 요약]
...

[상세 분석]
...

[주목 포인트]
...`;

export const PROMPT_VERSION = "v2";

export function buildUserPrompt(
  topic: string,
  articles: { title: string; description: string | null; content: string | null; relatedKeywords?: string[] }[],
  userRelatedKeywords?: string[]
): string {
  const articleTexts = articles
    .map((a, i) => {
      const parts = [`기사 ${i + 1}: ${a.title}`];
      if (a.description) parts.push(`요약: ${a.description}`);
      if (a.content) parts.push(`내용: ${a.content}`);
      if (a.relatedKeywords && a.relatedKeywords.length > 0) {
        parts.push(`이 기사에 함께 언급된 관심 키워드: ${a.relatedKeywords.join(", ")}`);
      }
      return parts.join("\n");
    })
    .join("\n\n---\n\n");

  const relatedContext = userRelatedKeywords && userRelatedKeywords.length > 0
    ? `\n사용자의 다른 관심 키워드: ${userRelatedKeywords.join(", ")}\n이 키워드들과 "${topic}"의 연관성을 분석에 반영해주세요.\n`
    : "";

  return `주제: ${topic}
${relatedContext}
아래 ${articles.length}개의 기사를 분석하여 브리핑을 작성해주세요.

${articleTexts}`;
}
