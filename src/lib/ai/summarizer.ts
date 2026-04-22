import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, getGeminiClient, getProvider } from "./client";
import { SYSTEM_PROMPT, PROMPT_VERSION, buildUserPrompt } from "./prompts";
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
        max_tokens: 2048,
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

  // 활성 그룹 + 오늘 생성분 + 최근 기사 모두 병렬 조회
  const [groupsRes, existingRes, articlesRes] = await Promise.all([
    supabase.from("interest_groups").select("*").eq("is_active", true),
    supabase.from("summaries").select("interest_group_id").eq("briefing_date", today),
    supabase
      .from("articles")
      .select("*")
      .gte("collected_at", yesterday)
      .order("is_major", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(2000),
  ]);

  const groups = groupsRes.data ?? [];
  const existing = existingRes.data ?? [];
  const allArticles = articlesRes.data ?? [];

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
      // 그룹에 맞는 기사 필터 (메모리에서)
      let matched: any[];
      if (group.group_type === "category") {
        matched = allArticles.filter((a: any) => a.category === group.group_key);
      } else {
        matched = allArticles.filter(
          (a: any) => (a.matched_keywords ?? []).includes(group.group_key)
        );
      }

      matched = matched.slice(0, 12);

      if (matched.length < 3) {
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

      await supabase.from("summaries").insert({
        interest_group_id: group.id,
        title: title || `${topic} 브리핑`,
        content,
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
