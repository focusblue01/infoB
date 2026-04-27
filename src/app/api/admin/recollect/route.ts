import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { collectNews } from "@/lib/news/collector";
import {
  inferCategory,
  scoreCategories,
  CLASSIFICATION_THRESHOLDS,
} from "@/lib/news/categoryKeywords";
import type { NewsCategory } from "@/types";

export const maxDuration = 300;

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// 주어진 KST yyyy-mm-dd 의 [start, end) UTC ISO 범위 계산
function kstDayRange(kstYmd: string): { startUtc: string; endUtc: string } {
  const [y, m, d] = kstYmd.split("-").map(Number);
  const startUtc = new Date(Date.UTC(y, m - 1, d, -9, 0, 0)).toISOString();
  const endUtc = new Date(Date.UTC(y, m - 1, d + 1, -9, 0, 0)).toISOString();
  return { startUtc, endUtc };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  let date: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.date === "string" && isValidDate(body.date)) date = body.date;
  } catch {
    // ignore
  }

  try {
    // 1) 기본: 최신 RSS/NewsAPI 재수집 (date 와 무관하게 항상 실행)
    const collectResult = await collectNews();

    // 2) date 가 지정되면 해당 KST 일자에 발행된 기존 articles 의 카테고리를
    //    v2 룰(점수 경쟁 + override) 로 재분류
    let reclassified = 0;
    if (date) {
      const { startUtc, endUtc } = kstDayRange(date);
      const { data: rows } = await supabase
        .from("articles")
        .select("id, title, description, category")
        .gte("published_at", startUtc)
        .lt("published_at", endUtc);

      const updates: { id: string; category: NewsCategory | null }[] = [];
      for (const a of rows ?? []) {
        const text = `${a.title} ${a.description ?? ""}`;
        const current = a.category as NewsCategory | null;
        let next: NewsCategory | null = current;

        if (!current) {
          next = inferCategory(text);
        } else {
          const scores = scoreCategories(text);
          const ranked = (Object.entries(scores) as Array<[NewsCategory, number]>)
            .filter(([, s]) => s > 0)
            .sort((x, y) => y[1] - x[1]);
          if (ranked.length > 0) {
            const [topCat, topScore] = ranked[0];
            if (
              topCat !== current &&
              topScore >= CLASSIFICATION_THRESHOLDS.STRONG_OVERRIDE_SCORE &&
              (scores[current] ?? 0) === 0
            ) {
              next = topCat;
            }
          }
        }
        if (next !== current) updates.push({ id: a.id, category: next });
      }

      // 청크 단위 update
      const CHUNK = 200;
      for (let i = 0; i < updates.length; i += CHUNK) {
        const chunk = updates.slice(i, i + CHUNK);
        await Promise.all(
          chunk.map((u) =>
            supabase.from("articles").update({ category: u.category }).eq("id", u.id)
          )
        );
      }
      reclassified = updates.length;
    }

    return NextResponse.json({
      success: true,
      date,
      collected: collectResult.collected,
      skipped: collectResult.skipped,
      reclassified,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
