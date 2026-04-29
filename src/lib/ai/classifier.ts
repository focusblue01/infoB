import crypto from "crypto";
import {
  getAnthropicClient,
  getGeminiClient,
  getOpenAIClient,
  getProvider,
  type AIStage,
} from "./client";
import { CLASSIFY_PROMPT } from "./prompts";
import type { NewsCategory } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

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

function titleHash(title: string): string {
  return crypto
    .createHash("sha1")
    .update(title.trim().toLowerCase())
    .digest("hex");
}

/**
 * 기사 목록을 LLM 으로 카테고리 분류한다.
 * - 결과 Map<id, NewsCategory | null>
 * - 'unknown' 또는 잘못된 카테고리는 null 로 매핑
 * - 실패 시 빈 Map 반환 (호출 측에서 graceful fallback)
 *
 * 캐시:
 *   - title sha1 → category 매핑을 ai_classification_cache 에 영구 저장
 *   - LLM 호출 전 캐시 조회로 중복 분류 회피 (B-4)
 */
export async function classifyArticlesAI(
  articles: InputArticle[],
  stage: AIStage,
  batchSize: number = 25
): Promise<Map<string, NewsCategory | null>> {
  const out = new Map<string, NewsCategory | null>();
  if (articles.length === 0) return out;

  const supabase = createAdminClient();

  // ── 캐시 조회 ────────────────────────────────────────────────
  const hashByExtId = new Map<string, string>();
  const hashes = articles.map((a) => {
    const h = titleHash(a.title);
    hashByExtId.set(a.id, h);
    return h;
  });

  let cachedHashSet: Set<string> = new Set();
  let cachedCatByHash: Map<string, NewsCategory | null> = new Map();
  try {
    const { data: cacheRows } = await supabase
      .from("ai_classification_cache")
      .select("title_hash, category")
      .in("title_hash", Array.from(new Set(hashes)));
    for (const r of cacheRows ?? []) {
      cachedHashSet.add(r.title_hash);
      const c = r.category as string | null;
      cachedCatByHash.set(
        r.title_hash,
        c && VALID_CATEGORIES.includes(c as NewsCategory) ? (c as NewsCategory) : null
      );
    }
  } catch {
    // 캐시 조회 실패는 graceful — 그냥 계속 진행
  }

  // 캐시 히트 적용
  const uncached: InputArticle[] = [];
  for (const a of articles) {
    const h = hashByExtId.get(a.id)!;
    if (cachedHashSet.has(h)) {
      out.set(a.id, cachedCatByHash.get(h) ?? null);
    } else {
      uncached.push(a);
    }
  }
  if (uncached.length === 0) return out;

  // ── LLM 호출 (캐시 미스 만) ──────────────────────────────────
  const newRows: { title_hash: string; category: NewsCategory | null }[] = [];

  for (let i = 0; i < uncached.length; i += batchSize) {
    const batch = uncached.slice(i, i + batchSize);
    try {
      const raw = await callRawByProvider(CLASSIFY_PROMPT, buildUserBlock(batch), stage);
      const json = extractJson(raw);
      const parsed = JSON.parse(json) as { items?: ClassifyItem[] };
      const items = parsed.items ?? [];
      for (const it of items) {
        const cat = (it.category ?? "").toLowerCase();
        const finalCat: NewsCategory | null = VALID_CATEGORIES.includes(cat as NewsCategory)
          ? (cat as NewsCategory)
          : null;
        out.set(it.id, finalCat);
        const h = hashByExtId.get(it.id);
        if (h) newRows.push({ title_hash: h, category: finalCat });
      }
    } catch (e: any) {
      console.error(`classifyArticlesAI batch failed (stage ${stage}):`, e?.message);
    }
  }

  // ── 캐시 upsert ──────────────────────────────────────────────
  if (newRows.length > 0) {
    try {
      // 청크 (Supabase upsert 한도 보호)
      const CHUNK = 500;
      for (let i = 0; i < newRows.length; i += CHUNK) {
        const slice = newRows.slice(i, i + CHUNK);
        await supabase
          .from("ai_classification_cache")
          .upsert(slice, { onConflict: "title_hash", ignoreDuplicates: true });
      }
    } catch (e: any) {
      console.error("ai_classification_cache upsert failed:", e?.message);
    }
  }

  return out;
}
