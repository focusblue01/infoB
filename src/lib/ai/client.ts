import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

let anthropicClient: Anthropic | null = null;
let geminiClient: GoogleGenerativeAI | null = null;
let openaiClient: OpenAI | null = null;

export type AIProvider = "anthropic" | "gemini" | "openai";

export function getProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (provider === "openai" && process.env.OPENAI_API_KEY) return "openai";
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
