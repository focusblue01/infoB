import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, getGeminiClient, getProvider } from "./client";
import { SYSTEM_PROMPT, PROMPT_VERSION, buildUserPrompt } from "./prompts";
import { CATEGORY_LABELS, type NewsCategory } from "@/types";
import { getKSTDateString } from "@/lib/date";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const GEMINI_MODEL = "gemini-1.5-flash";
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

  // "제목: ..." 패턴 찾기
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("제목:") || lines[i].startsWith("제목 :")) {
      title = lines[i].replace(/^제목\s*:\s*/, "").trim();
      contentStart = i + 1;
      break;
    }
  }

  // 제목을 못 찾으면 첫 줄을 제목으로
  if (!title && lines.length > 0) {
    title = lines[0].replace(/^#+\s*/, "").trim();
    contentStart = 1;
  }

  const content = lines
    .slice(contentStart)
    .join("\n")
    .trim();

  return { title, content };
}

export async function generateSummaries(): Promise<SummaryResult[]> {
  const supabase = createAdminClient();
  const results: SummaryResult[] = [];
  const today = getKSTDateString();

  // 활성 interest_groups 조회
  const { data: groups } = await supabase
    .from("interest_groups")
    .select("*")
    .eq("is_active", true);

  if (!groups?.length) return results;

  // 오늘 이미 생성된 요약 확인
  const { data: existing } = await supabase
    .from("summaries")
    .select("interest_group_id")
    .eq("briefing_date", today);

  const existingGroupIds = new Set((existing ?? []).map((e: any) => e.interest_group_id));

  for (const group of groups) {
    if (existingGroupIds.has(group.id)) {
      results.push({ groupId: group.id, topic: group.group_key, success: true });
      continue;
    }

    try {
      // 최근 24시간 기사 조회
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      let query = supabase
        .from("articles")
        .select("*")
        .gte("collected_at", yesterday)
        .order("is_major", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(10);

      if (group.group_type === "category") {
        query = query.eq("category", group.group_key);
      } else {
        // 키워드 매칭: matched_keywords 배열에 포함
        query = query.contains("matched_keywords", [group.group_key]);
      }

      const { data: articles } = await query;

      // 기사 3건 미만이면 스킵
      if (!articles || articles.length < 3) {
        results.push({ groupId: group.id, topic: group.group_key, success: true });
        continue;
      }

      // 토픽 이름 결정
      const topic =
        group.group_type === "category"
          ? CATEGORY_LABELS[group.group_key as NewsCategory] ?? group.group_key
          : group.group_key;

      // Claude API 호출
      const userPrompt = buildUserPrompt(
        topic,
        articles.map((a: any) => ({
          title: a.title,
          description: a.description,
          content: a.content,
        }))
      );

      const { content: rawResponse, inputTokens, outputTokens, modelUsed } =
        await callAIWithRetry(SYSTEM_PROMPT, userPrompt);

      const { title, content } = parseSummaryResponse(rawResponse);

      // 요약 저장
      await supabase.from("summaries").insert({
        interest_group_id: group.id,
        title: title || `${topic} 브리핑`,
        content,
        category: group.group_type === "category" ? group.group_key : null,
        keywords: group.group_type === "keyword" ? [group.group_key, ...(group.similar_keywords ?? [])] : [],
        article_ids: articles.map((a: any) => a.id),
        briefing_date: today,
        prompt_version: PROMPT_VERSION,
        model_used: modelUsed,
        token_count: inputTokens + outputTokens,
      });

      results.push({ groupId: group.id, topic: group.group_key, success: true });
    } catch (error: any) {
      console.error(`Summary generation failed for ${group.group_key}:`, error.message);
      results.push({
        groupId: group.id,
        topic: group.group_key,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}
