import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getAnthropicClient,
  getGeminiClient,
  getOpenAIClient,
  getProvider,
  type AIProvider,
  type AIRole,
} from "@/lib/ai/client";

export const maxDuration = 60;

interface ProviderTest {
  provider: AIProvider;
  ok: boolean;
  reply?: string;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
  durationMs: number;
}

const TEST_PROMPT = "Say 'pong' in one word.";

async function pingAnthropic(): Promise<Omit<ProviderTest, "provider" | "durationMs">> {
  const client = getAnthropicClient();
  const resp = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 32,
    messages: [{ role: "user", content: TEST_PROMPT }],
  });
  const block = resp.content.find((b) => b.type === "text");
  return {
    ok: true,
    reply: (block as any)?.text?.trim().slice(0, 200) ?? "",
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
  };
}

async function pingGemini(): Promise<Omit<ProviderTest, "provider" | "durationMs">> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: "gemini-flash-lite-latest" });
  const result = await model.generateContent(TEST_PROMPT);
  const text = result.response.text();
  const usage = result.response.usageMetadata;
  return {
    ok: true,
    reply: text.trim().slice(0, 200),
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
  };
}

async function pingOpenAI(): Promise<Omit<ProviderTest, "provider" | "durationMs">> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const resp = await client.chat.completions.create({
    model,
    max_tokens: 32,
    messages: [{ role: "user", content: TEST_PROMPT }],
  });
  return {
    ok: true,
    reply: resp.choices[0]?.message?.content?.trim().slice(0, 200) ?? "",
    inputTokens: resp.usage?.prompt_tokens ?? 0,
    outputTokens: resp.usage?.completion_tokens ?? 0,
  };
}

async function pingProvider(p: AIProvider): Promise<ProviderTest> {
  const t0 = Date.now();
  try {
    const inner =
      p === "anthropic" ? await pingAnthropic() :
      p === "gemini" ? await pingGemini() :
      await pingOpenAI();
    return { provider: p, durationMs: Date.now() - t0, ...inner };
  } catch (e: any) {
    return {
      provider: p,
      ok: false,
      error: e?.message ?? "unknown",
      durationMs: Date.now() - t0,
    };
  }
}

export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  // env 상태 스냅샷
  const env = {
    AI_PROVIDER_1: process.env.AI_PROVIDER_1 ?? null,
    AI_PROVIDER_2: process.env.AI_PROVIDER_2 ?? null,
    AI_PROVIDER: process.env.AI_PROVIDER ?? null,
    keys: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
    },
  };

  const roles: AIRole[] = ["collection", "briefing"];
  const resolved: Record<AIRole, AIProvider> = {
    collection: getProvider("collection"),
    briefing: getProvider("briefing"),
  };

  // 동일 provider 면 한 번만 핑하고 재사용
  const providersToPing = Array.from(new Set(roles.map((r) => resolved[r])));
  const pingResults = await Promise.all(providersToPing.map((p) => pingProvider(p)));
  const pingMap = new Map(pingResults.map((r) => [r.provider, r]));

  const perRole = roles.map((role) => {
    const p = resolved[role];
    const ping = pingMap.get(p)!;
    return { role, ...ping };
  });

  return NextResponse.json({
    success: true,
    env,
    resolved,
    perRole,
    pings: pingResults,
  });
}
