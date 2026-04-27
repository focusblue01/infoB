import {
  getAnthropicClient,
  getGeminiClient,
  getOpenAIClient,
  getProvider,
  type AIStage,
} from "./client";
import { CLASSIFY_PROMPT } from "./prompts";
import type { NewsCategory } from "@/types";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const GEMINI_MODEL = "gemini-flash-lite-latest";
function openaiModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-5-mini";
}

const VALID_CATEGORIES: ReadonlyArray<NewsCategory> = [
  "technology",
  "economy",
  "politics",
  "society",
  "culture",
  "sports",
  "science",
  "global",
];

interface InputArticle {
  id: string;
  title: string;
  description?: string | null;
}

interface ClassifyItem {
  id: string;
  category: string;
}

function buildUserBlock(articles: InputArticle[]): string {
  return articles
    .map((a) => {
      const desc = (a.description ?? "").replace(/\s+/g, " ").slice(0, 400);
      return `id: ${a.id}\ntitle: ${a.title}\ndescription: ${desc}\n---`;
    })
    .join("\n");
}

function extractJson(raw: string): string {
  // 코드블록 제거
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  // 첫 { 부터 마지막 } 까지
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return cleaned;
  return cleaned.slice(start, end + 1);
}

async function callRawByProvider(
  systemPrompt: string,
  userPrompt: string,
  stage: AIStage
): Promise<string> {
  const provider = getProvider(stage);
  if (provider === "gemini") {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(userPrompt);
    return result.response.text();
  }
  if (provider === "openai") {
    const client = getOpenAIClient();
    const resp = await client.chat.completions.create({
      model: openaiModel(),
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return resp.choices[0]?.message?.content ?? "";
  }
  // anthropic
  const client = getAnthropicClient();
  const resp = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = resp.content.find((b) => b.type === "text");
  return (block as any)?.text ?? "";
}

/**
 * 기사 목록을 LLM 으로 카테고리 분류한다.
 * - 결과 Map<id, NewsCategory | null>
 * - 'unknown' 또는 잘못된 카테고리는 null 로 매핑
 * - 실패 시 빈 Map 반환 (호출 측에서 graceful fallback)
 */
export async function classifyArticlesAI(
  articles: InputArticle[],
  stage: AIStage,
  batchSize: number = 25
): Promise<Map<string, NewsCategory | null>> {
  const out = new Map<string, NewsCategory | null>();
  if (articles.length === 0) return out;

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    try {
      const raw = await callRawByProvider(CLASSIFY_PROMPT, buildUserBlock(batch), stage);
      const json = extractJson(raw);
      const parsed = JSON.parse(json) as { items?: ClassifyItem[] };
      const items = parsed.items ?? [];
      for (const it of items) {
        const cat = (it.category ?? "").toLowerCase();
        if (VALID_CATEGORIES.includes(cat as NewsCategory)) {
          out.set(it.id, cat as NewsCategory);
        } else {
          out.set(it.id, null);
        }
      }
    } catch (e: any) {
      // 배치 실패 → 다음 배치로 계속, 결과는 비워 둠
      console.error(`classifyArticlesAI batch failed (stage ${stage}):`, e?.message);
    }
  }
  return out;
}
