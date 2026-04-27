import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

let anthropicClient: Anthropic | null = null;
let geminiClient: GoogleGenerativeAI | null = null;
let openaiClient: OpenAI | null = null;

export type AIProvider = "anthropic" | "gemini" | "openai";

/**
 * 두 단계로 워크로드를 분배한다.
 *  - Stage 1 (AI_PROVIDER_1):
 *      · 기사 수집 단계의 빠른 1차 분류
 *      · 브리핑 생성의 초안 생성
 *  - Stage 2 (AI_PROVIDER_2):
 *      · 1차 분류로 결정 못한 기사의 카테고리/키워드 분배
 *      · 브리핑 초안의 검수/보완
 *
 * 둘 다 유효하면 단계별로 분리, 한쪽만 유효하면 그 쪽이 양쪽 처리.
 * 모두 비어있으면 레거시 AI_PROVIDER → anthropic 기본값.
 */
export type AIStage = 1 | 2;

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

export function getProvider(stage: AIStage = 1): AIProvider {
  const primaryEnv = stage === 1 ? "AI_PROVIDER_1" : "AI_PROVIDER_2";
  const fallbackEnv = stage === 1 ? "AI_PROVIDER_2" : "AI_PROVIDER_1";

  const own = resolveCandidate(primaryEnv);
  if (own) return own;

  const other = resolveCandidate(fallbackEnv);
  if (other) return other;

  const legacy = resolveCandidate("AI_PROVIDER");
  if (legacy) return legacy;

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
