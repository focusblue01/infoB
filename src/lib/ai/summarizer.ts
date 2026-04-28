import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, getGeminiClient, getOpenAIClient, getProvider, type AIStage } from "./client";
import { SYSTEM_PROMPT, ENGLISH_TRANSLATION_PROMPT, REVIEW_PROMPT, PROMPT_VERSION, buildUserPrompt } from "./prompts";
import { CATEGORY_LABELS, type NewsCategory } from "@/types";
import { getKSTDateString } from "@/lib/date";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const GEMINI_MODEL = "gemini-flash-lite-latest";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5-mini";
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

async function callOpenAIWithRetry(
  systemPrompt: string,
  userPrompt: string,
  retries = MAX_RETRIES
): Promise<AIResponse> {
  const client = getOpenAIClient();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: OPENAI_MODEL,
        max_completion_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const text = response.choices[0]?.message?.content ?? "";
      return {
        content: text,
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        modelUsed: OPENAI_MODEL,
      };
    } catch (error: any) {
      console.error(`OpenAI API attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error("Max retries reached");
}

export async function callAIWithRetry(
  systemPrompt: string,
  userPrompt: string,
  stage: AIStage = 1
): Promise<AIResponse> {
  const provider = getProvider(stage);
  if (provider === "gemini") {
    return callGeminiWithRetry(systemPrompt, userPrompt);
  }
  if (provider === "openai") {
    return callOpenAIWithRetry(systemPrompt, userPrompt);
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

export async function generateSummaries(opts?: { onlyGroupIds?: string[]; targetDate?: string }): Promise<SummaryResult[]> {
  const supabase = createAdminClient();
  // targetDate(KST yyyy-mm-dd) 가 주어지면 그 날짜 기준으로 브리핑을 생성한다.
  const today = opts?.targetDate ?? getKSTDateString();
  // 브리핑 참조 기준: 조회일 기준 전일(KST) 00:00 부터만 허용 (엄격 제한)
  // 예: 오늘이 KST 2026-04-24 이면 기사 published_at >= 2026-04-23T00:00:00+09:00 (= 2026-04-22T15:00:00Z)
  const [kstYyyy, kstMm, kstDd] = today.split("-").map(Number);
  const briefingCutoff = new Date(Date.UTC(kstYyyy, kstMm - 1, kstDd - 1, -9, 0, 0)).toISOString();
  // collected_at 도 같은 기준으로 제한
  const collectedCutoff = briefingCutoff;

  // 활성 그룹 + 오늘 생성분 병렬 조회 (기사는 그룹별 직접 조회로 변경)
  const [groupsRes, existingRes] = await Promise.all([
    supabase.from("interest_groups").select("*").eq("is_active", true),
    supabase.from("summaries").select("interest_group_id").eq("briefing_date", today),
  ]);

  const allGroups = groupsRes.data ?? [];
  const existing = existingRes.data ?? [];

  // 특정 그룹 ID 필터 적용 (신규 키워드 즉시 생성 등에 사용)
  const groups = opts?.onlyGroupIds && opts.onlyGroupIds.length > 0
    ? allGroups.filter((g: any) => opts.onlyGroupIds!.includes(g.id))
    : allGroups;

  if (!groups.length) return [];

  const existingGroupIds = new Set(existing.map((e: any) => e.interest_group_id));
  // related keywords 컨텍스트는 항상 전체 키워드 그룹 기준으로 제공
  const relatedKeywordsAll = allGroups
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
          .gte("collected_at", collectedCutoff)
          .gte("published_at", briefingCutoff)
          .order("published_at", { ascending: false })
          .order("is_major", { ascending: false })
          .limit(30);
      } else {
        articlesQuery = supabase
          .from("articles")
          .select("*")
          .contains("matched_keywords", [group.group_key])
          .gte("collected_at", collectedCutoff)
          .gte("published_at", briefingCutoff)
          .order("published_at", { ascending: false })
          .order("is_major", { ascending: false })
          .limit(30);
      }

      const { data: fetched } = await articlesQuery;

      // 연합뉴스/연합인포맥스/연합뉴스TV 우선 정렬 후 상위 12개 선택
      const PRIORITY_SOURCES = ["연합인포맥스", "연합뉴스TV", "연합뉴스"];
      const getPriority = (sourceName: string) => {
        const idx = PRIORITY_SOURCES.findIndex((p) => sourceName.startsWith(p));
        return idx === -1 ? PRIORITY_SOURCES.length : idx;
      };
      const toKstDay = (iso: string | null): string => {
        if (!iso) return "";
        const d = new Date(iso);
        return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      };
      const sorted = fetched
        ? [...fetched].sort((a, b) => {
            // 1순위: 발행일(KST 기준) 최신 우선 — 날짜 역전 방지
            const dayA = toKstDay(a.published_at);
            const dayB = toKstDay(b.published_at);
            if (dayA !== dayB) return dayB.localeCompare(dayA);
            // 2순위: is_major 우선
            if (a.is_major !== b.is_major) return (b.is_major ? 1 : 0) - (a.is_major ? 1 : 0);
            // 3순위: 우선 소스(연합뉴스 계열)
            const pa = getPriority(a.source_name ?? "");
            const pb = getPriority(b.source_name ?? "");
            if (pa !== pb) return pa - pb;
            // 4순위: 동일 날짜 내 최신 timestamp
            return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime();
          })
        : null;

      // 소스 다양성 + (글로벌 토픽인 경우) 국내/해외 50:50 균형
      const TOP_N = 12;
      const PER_SOURCE_CAP = 2;

      // 한글 음절 포함 여부로 국내/해외 소스 판별
      const HANGUL_RE = /[ㄱ-힝]/;
      const isDomestic = (a: any) => HANGUL_RE.test(a.source_name ?? "");

      // 글로벌 토픽 여부: category=global 이거나, 키워드가 글로벌 관련 토큰
      const GLOBAL_KEYWORD_HINTS = [
        "국제", "세계", "외교", "미국", "중국", "일본", "유럽", "러시아",
        "우크라이나", "중동", "이스라엘", "팔레스타인", "유엔", "나토",
        "EU", "G7", "G20", "백악관", "크렘린", "워싱턴", "베이징", "도쿄",
      ];
      const isGlobalTopic =
        (group.group_type === "category" && group.group_key === "global") ||
        (group.group_type === "keyword" &&
          GLOBAL_KEYWORD_HINTS.some((h) => (group.group_key as string).includes(h)));

      // per-source cap 적용해 pool 에서 상위 limit 만큼 뽑는 헬퍼
      const pickWithCap = (pool: any[], limit: number) => {
        const counts = new Map<string, number>();
        const picked: any[] = [];
        const remainder: any[] = [];
        for (const a of pool) {
          const key = a.source_name ?? "";
          const c = counts.get(key) ?? 0;
          if (picked.length < limit && c < PER_SOURCE_CAP) {
            picked.push(a);
            counts.set(key, c + 1);
          } else {
            remainder.push(a);
          }
        }
        // 풀이 모자라면 cap 무시하고 채움
        for (const a of remainder) {
          if (picked.length >= limit) break;
          picked.push(a);
        }
        return picked;
      };

      let matched: typeof sorted = null;
      if (sorted) {
        if (isGlobalTopic) {
          const half = Math.floor(TOP_N / 2);
          const domesticPool = sorted.filter(isDomestic);
          const internationalPool = sorted.filter((a) => !isDomestic(a));
          const dPicks = pickWithCap(domesticPool, half);
          const iPicks = pickWithCap(internationalPool, TOP_N - half);
          // 한쪽이 모자라면 반대쪽으로 보충 (50:50 가능한 한 유지하되 12건 우선)
          let combined = [...dPicks, ...iPicks];
          if (combined.length < TOP_N) {
            const usedIds = new Set(combined.map((a) => a.id));
            for (const a of sorted) {
              if (combined.length >= TOP_N) break;
              if (!usedIds.has(a.id)) combined.push(a);
            }
          }
          matched = combined.slice(0, TOP_N);
        } else {
          matched = pickWithCap(sorted, TOP_N).slice(0, TOP_N);
        }
      }

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

      // Stage 1: 초안 생성 (AI_PROVIDER_1)
      const draft = await callAIWithRetry(SYSTEM_PROMPT, userPrompt, 1);
      const draftParsed = parseSummaryResponse(draft.content);
      let title = draftParsed.title;
      let content = draftParsed.content;
      let totalInputTokens = draft.inputTokens;
      let totalOutputTokens = draft.outputTokens;
      let modelUsed = draft.modelUsed;

      // Stage 2: 검수/보완 (AI_PROVIDER_2)
      // 두 stage 가 같은 provider 로 해석되면 검수 패스를 건너뛰어 토큰 절약
      const draftProvider = getProvider(1);
      const reviewProvider = getProvider(2);
      if (reviewProvider !== draftProvider) {
        try {
          const reviewInput = `제목: ${title}\n\n${content}`;
          const reviewed = await callAIWithRetry(REVIEW_PROMPT, reviewInput, 2);
          const reviewedParsed = parseSummaryResponse(reviewed.content);
          // 검수 결과가 비정상적으로 짧으면 초안 유지
          if (reviewedParsed.content && reviewedParsed.content.length >= 600) {
            if (reviewedParsed.title) title = reviewedParsed.title;
            content = reviewedParsed.content;
            totalInputTokens += reviewed.inputTokens;
            totalOutputTokens += reviewed.outputTokens;
            modelUsed = `${draft.modelUsed}+${reviewed.modelUsed}`;
          }
        } catch (e: any) {
          console.error(`Review pass failed for ${topic}, using draft:`, e?.message);
        }
      }

      const inputTokens = totalInputTokens;
      const outputTokens = totalOutputTokens;

      // 영어 번역은 stage 1 (수집측 부수 작업)
      let titleEn: string | null = null;
      let contentEn: string | null = null;
      try {
        const { content: rawEn } = await callAIWithRetry(
          ENGLISH_TRANSLATION_PROMPT,
          `${title || topic}\n\n${content}`,
          1
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
