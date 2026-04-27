import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, getGeminiClient, getOpenAIClient, getProvider } from "@/lib/ai/client";
import { ENGLISH_TRANSLATION_PROMPT } from "@/lib/ai/prompts";

export const maxDuration = 120;

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const GEMINI_MODEL = "gemini-flash-lite-latest";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

async function translateToEnglish(koreanContent: string): Promise<{ title: string; content: string }> {
  // 번역은 수집 부수 작업 → collection role provider 사용
  const provider = getProvider("collection");
  let rawText = "";

  if (provider === "gemini") {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: ENGLISH_TRANSLATION_PROMPT,
    });
    const result = await model.generateContent(koreanContent);
    rawText = result.response.text();
  } else if (provider === "openai") {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: ENGLISH_TRANSLATION_PROMPT },
        { role: "user", content: koreanContent },
      ],
    });
    rawText = response.choices[0]?.message?.content ?? "";
  } else {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: ENGLISH_TRANSLATION_PROMPT,
      messages: [{ role: "user", content: koreanContent }],
    });
    const block = response.content.find((b) => b.type === "text");
    rawText = block?.text ?? "";
  }

  // Parse Title: from response
  const lines = rawText.trim().split("\n");
  let title = "";
  let contentStart = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^Title\s*:/i)) {
      title = lines[i].replace(/^Title\s*:\s*/i, "").trim();
      contentStart = i + 1;
      break;
    }
  }

  if (!title && lines.length > 0) {
    title = lines[0].replace(/^#+\s*/, "").trim();
    contentStart = 1;
  }

  return { title, content: lines.slice(contentStart).join("\n").trim() };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { summaryIds } = await request.json();
  if (!Array.isArray(summaryIds) || summaryIds.length === 0) {
    return NextResponse.json({ error: "summaryIds required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch summaries that need translation (no content_en yet)
  const { data: summaries } = await admin
    .from("summaries")
    .select("id, title, content")
    .in("id", summaryIds)
    .is("content_en", null);

  const toTranslate = summaries ?? [];

  // Translate in parallel
  const results = await Promise.all(
    toTranslate.map(async (s: any) => {
      try {
        const input = `${s.title}\n\n${s.content}`;
        const { title, content } = await translateToEnglish(input);

        await admin
          .from("summaries")
          .update({ title_en: title, content_en: content })
          .eq("id", s.id);

        return { id: s.id, title_en: title, content_en: content };
      } catch (err: any) {
        console.error(`Translation failed for ${s.id}:`, err.message);
        return { id: s.id, error: err.message };
      }
    })
  );

  // Also fetch already-translated ones so caller gets full set
  const { data: alreadyDone } = await admin
    .from("summaries")
    .select("id, title_en, content_en")
    .in("id", summaryIds)
    .not("content_en", "is", null);

  const translations: Record<string, { title_en: string; content_en: string }> = {};

  for (const r of results) {
    if (r.title_en) translations[r.id] = { title_en: r.title_en, content_en: r.content_en };
  }
  for (const r of alreadyDone ?? []) {
    if (!translations[r.id]) translations[r.id] = { title_en: r.title_en, content_en: r.content_en };
  }

  return NextResponse.json({ translations });
}
