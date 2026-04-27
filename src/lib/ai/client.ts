import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

let anthropicClient: Anthropic | null = null;
let geminiClient: GoogleGenerativeAI | null = null;
let openaiClient: OpenAI | null = null;

export type AIProvider = "anthropic" | "gemini" | "openai";

/**
 * 워크로드 역할:
 *  - collection: 기사 수집 부수 작업 (예: 영어 번역, 분류 보조 등)
 *  - briefing : 메인 브리핑(요약) 생성
 *
 * 환경변수 AI_PROVIDER_1 / AI_PROVIDER_2 로 두 역할의 provider 를 분리할 수 있다.
 *  - 둘 다 유효하게 설정되어 있으면: 역할별로 분리 사용
 *  - 한쪽만 유효하면: 양쪽 역할이 모두 그 한쪽으로 처리됨
 *  - 둘 다 비어 있으면: 레거시 AI_PROVIDER → 그도 없으면 anthropic
 */
export type AIRole = "collection" | "briefing";

function normalize(p: string | undefined): AIProvider | null {
  if (!p) return null;
  const v = p.toLowerCase();
  if (v === "gemini") return "gemini";
  if (v === "openai") return "openai";
  if (v === "anthropic") return "anthropic";
  return null;
}

function isUsable(p: AIProvider | null): p is AIProvider {
  if (!p) return false;
  if (p === "gemini") return !!process.env.GEMINI_API_KEY;
  if (p === "openai") return !!process.env.OPENAI_API_KEY;
  if (p === "anthropic") return !!process.env.ANTHROPIC_API_KEY;
  return false;
}

function resolveCandidate(envName: string): AIProvider | null {
  const candidate = normalize(process.env[envName]);
  return isUsable(candidate) ? candidate : null;
}

export function getProvider(role: AIRole = "briefing"): AIProvider {
  const primaryEnv = role === "collection" ? "AI_PROVIDER_1" : "AI_PROVIDER_2";
  const fallbackEnv = role === "collection" ? "AI_PROVIDER_2" : "AI_PROVIDER_1";

  // 1) 자기 역할 env 가 유효하면 그것을 사용
  const own = resolveCandidate(primaryEnv);
  if (own) return own;

  // 2) 다른 역할 env 가 유효하면 그것으로 대체 (둘 중 하나만 설정된 경우)
  const other = resolveCandidate(fallbackEnv);
  if (other) return other;

  // 3) 레거시 AI_PROVIDER (이전 버전 호환)
  const legacy = resolveCandidate("AI_PROVIDER");
  if (legacy) return legacy;

  // 4) 기본값: anthropic
  return "anthropic";
}

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
  }
  return geminiClient;
}

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}
