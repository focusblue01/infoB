import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, getGeminiClient, getProvider } from "./client";
import { SYSTEM_PROMPT, ENGLISH_TRANSLATION_PROMPT, PROMPT_VERSION, buildUserPrompt } from "./prompts";
import { CATEGORY_LABELS, type NewsCategory } from "@/types";
import { getKSTDateString } from "@/lib/date";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const GEMINI_MODEL = "gemini-flash-lite-latest";
const MAX_RETRIES = 3;

interface SummaryResult {
  groupId: string;
  topic: string;
  success: boolean;
  error?: string;
}

interface AIResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  modelUsed: string;
}

async function callAnthropicWithRetry(
  systemPrompt: string,
  userPrompt: string,
  retries = MAX_RETRIES
): Promise<AIResponse> {
  const client = getAnthropicClient();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      return {
        content: textBlock?.text ?? "",
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        modelUsed: ANTHROPIC_MODEL,
      };
    } catch (error: any) {
      console.error(`Anthropic API attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error("Max retries reached");
}

async function callGeminiWithRetry(
  systemPrompt: string,
  userPrompt: string,
  retries = MAX_RETRIES
): Promise<AIResponse> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      const usage = result.response.usageMetadata;
      return {
        content: text,
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
        modelUsed: GEMINI_MODEL,
      };
    } catch (error: any) {
      console.error(`Gemini API attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error("Max retries reached");
}

async function callAIWithRetry(
  systemPrompt: string,
  userPrompt: string
): Promise<AIResponse> {
  const provider = getProvider();
  if (provider === "gemini") {
    return callGeminiWithRetry(systemPrompt, userPrompt);
  }
  return callAnthropicWithRetry(systemPrompt, userPrompt);
}

function parseSummaryResponse(text: string): { title: string; content: string } {
  const lines = text.trim().split("\n");

  let title = "";
  let contentStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^(제목|Title)\s*:/i)) {
      title = line.replace(/^(제목|Title)\s*:\s*/i, "").trim();
      contentStart = i + 1;
      break;
    }
  }

  if (!title && lines.length > 0) {
    title = lines[0].replace(/^#+\s*/, "").trim();
    contentStart = 1;
  }

  const content = lines.slice(contentStart).join("\n").trim();
  return { title, content };
}

export async function generateSummaries(): Promise<SummaryResult[]> {
  const supabase = createAdminClient();
  const today = getKSTDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // 활성 그룹 + 오늘 생성분 병렬 조회 (기사는 그룹별 직접 조회로 변경)
  const [groupsRes, existingRes] = await Promise.all([
    supabase.from("interest_groups").select("*").eq("is_active", true),
    supabase.from("summaries").select("interest_group_id").eq("briefing_date", today),
  ]);

  const groups = groupsRes.data ?? [];
  const existing = existingRes.data ?? [];

  if (!groups.length) return [];

  const existingGroupIds = new Set(existing.map((e: any) => e.interest_group_id));
  const relatedKeywordsAll = groups
    .filter((g: any) => g.group_type === "keyword")
    .map((g: any) => g.group_key);

  // 그룹별 병렬 처리
  const tasks = groups.map(async (group: any): Promise<SummaryResult> => {
    if (existingGroupIds.has(group.id)) {
      return { groupId: group.id, topic: group.group_key, success: true };
    }

    try {
      // 기사를 그룹별로 DB에서 직접 조회 (전체 로드 후 필터 방식의 limit 문제 제거)
      let articlesQuery;
      if (group.group_type === "category") {
        articlesQuery = supabase
          .from("articles")
          .select("*")
          .eq("category", group.group_key)
          .gte("collected_at", yesterday)
          .order("is_major", { ascending: false })
          .order("published_at", { ascending: false })
          .limit(12);
      } else {
        articlesQuery = supabase
          .from("articles")
          .select("*")
          .contains("matched_keywords", [group.group_key])
          .gte("collected_at", yesterday)
          .order("is_major", { ascending: false })
          .order("published_at", { ascending: false })
          .limit(12);
      }

      const { data: matched } = await articlesQuery;

      if (!matched || matched.length < 3) {
        return { groupId: group.id, topic: group.group_key, success: true };
      }

      const topic =
        group.group_type === "category"
          ? CATEGORY_LABELS[group.group_key as NewsCategory] ?? group.group_key
          : group.group_key;

      const relatedKeywords = relatedKeywordsAll.filter((k: string) => k !== group.group_key);

      const userPrompt = buildUserPrompt(
        topic,
        matched.map((a: any) => ({
          title: a.title,
          description: a.description,
          content: a.content,
          relatedKeywords: (a.matched_keywords ?? []).filter(
            (k: string) => relatedKeywords.includes(k) && k !== group.group_key
          ),
        })),
        relatedKeywords
      );

      const { content: rawResponse, inputTokens, outputTokens, modelUsed } =
        await callAIWithRetry(SYSTEM_PROMPT, userPrompt);

      const { title, content } = parseSummaryResponse(rawResponse);

      // 한국어 생성과 동시에 영어 번역 생성
      let titleEn: string | null = null;
      let contentEn: string | null = null;
      try {
        const { content: rawEn } = await callAIWithRetry(
          ENGLISH_TRANSLATION_PROMPT,
          `${title || topic}\n\n${content}`
        );
        const parsed = parseSummaryResponse(rawEn);
        titleEn = parsed.title || null;
        contentEn = parsed.content || null;
      } catch (e: any) {
        console.error(`English translation failed for ${topic}:`, e.message);
      }

      await supabase.from("summaries").insert({
        interest_group_id: group.id,
        title: title || `${topic} 브리핑`,
        content,
        title_en: titleEn,
        content_en: contentEn,
        category: group.group_type === "category" ? group.group_key : null,
        keywords: group.group_type === "keyword" ? [group.group_key, ...(group.similar_keywords ?? [])] : [],
        article_ids: matched.map((a: any) => a.id),
        briefing_date: today,
        prompt_version: PROMPT_VERSION,
        model_used: modelUsed,
        token_count: inputTokens + outputTokens,
      });

      return { groupId: group.id, topic: group.group_key, success: true };
    } catch (error: any) {
      console.error(`Summary failed for ${group.group_key}:`, error.message);
      return {
        groupId: group.id,
        topic: group.group_key,
        success: false,
        error: error.message,
      };
    }
  });

  return Promise.all(tasks);
}
