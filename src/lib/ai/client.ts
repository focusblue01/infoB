import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

let anthropicClient: Anthropic | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

export type AIProvider = "anthropic" | "gemini";

export function getProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
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
