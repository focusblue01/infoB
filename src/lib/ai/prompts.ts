export const SYSTEM_PROMPT = `You are a news analyst. Analyze the provided articles and write a structured English briefing of 600-900 words.

Format:
Title: [Brief title]

[Key Summary] 3 sentences summarizing core content.

[Analysis] Analyze background, causes, and impact. Actively discuss connections to other listed keywords of interest and ripple effects on markets/industries.

[Key Takeaways] 2-3 core insights. Include potential impact on other areas of interest.

Rules:
- Write in English only.
- Be objective but provide useful insights.
- If "related keywords" are provided, analyze their relationship with the topic.
- Avoid advertising content or political bias.
- Output must start with "Title: ..." then empty line then body.`;

export const TRANSLATION_SYSTEM_PROMPT = `You are a professional Korean translator. Translate the following English news briefing into natural, fluent Korean while preserving the structure and meaning.

Rules:
- Translate all section headers: [Key Summary] → [핵심 요약], [Analysis] → [상세 분석], [Key Takeaways] → [주목 포인트]
- Translate "Title:" → "제목:"
- Keep brand names, proper nouns, and ticker symbols as-is unless a standard Korean equivalent exists
- Use natural Korean news writing style
- Output only the translation, no commentary`;

export const PROMPT_VERSION = "v3-en-translate";

export function buildUserPrompt(
  topic: string,
  articles: { title: string; description: string | null; content: string | null; relatedKeywords?: string[] }[],
  userRelatedKeywords?: string[]
): string {
  const articleTexts = articles
    .map((a, i) => {
      const parts = [`Article ${i + 1}: ${a.title}`];
      if (a.description) parts.push(`Summary: ${a.description}`);
      if (a.content) parts.push(`Content: ${a.content}`);
      if (a.relatedKeywords && a.relatedKeywords.length > 0) {
        parts.push(`Related keywords in this article: ${a.relatedKeywords.join(", ")}`);
      }
      return parts.join("\n");
    })
    .join("\n\n---\n\n");

  const relatedContext = userRelatedKeywords && userRelatedKeywords.length > 0
    ? `\nUser's other keywords of interest: ${userRelatedKeywords.join(", ")}\nAnalyze the connection between these keywords and "${topic}".\n`
    : "";

  return `Topic: ${topic}
${relatedContext}
Analyze the following ${articles.length} articles and write a briefing.

${articleTexts}`;
}

export function buildTranslationPrompt(englishBriefing: string): string {
  return `Translate the following English briefing into Korean:\n\n${englishBriefing}`;
}
