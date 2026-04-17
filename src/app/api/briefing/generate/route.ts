import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectNews } from "@/lib/news/collector";
import { generateSummaries } from "@/lib/ai/summarizer";

export const maxDuration = 300;

// POST: 현재 로그인 사용자의 관심사 기반으로 브리핑 즉시 생성
export async function POST() {
  try {
    // 1. 사용자 인증
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // 2. 사용자의 카테고리/키워드로 interest_groups 보장
    const [categoriesRes, keywordsRes] = await Promise.all([
      admin.from("user_categories").select("category").eq("user_id", user.id),
      admin.from("user_keywords").select("keyword, is_exclude").eq("user_id", user.id),
    ]);

    const categories = (categoriesRes.data ?? []).map((c: any) => c.category);
    const keywords = (keywordsRes.data ?? [])
      .filter((k: any) => !k.is_exclude)
      .map((k: any) => k.keyword);

    if (categories.length === 0 && keywords.length === 0) {
      return NextResponse.json(
        { error: "관심사가 설정되지 않았습니다. 설정에서 카테고리 또는 키워드를 추가해주세요." },
        { status: 400 }
      );
    }

    // interest_groups에 upsert
    const groupsToUpsert = [
      ...categories.map((c: string) => ({
        group_type: "category",
        group_key: c,
        is_active: true,
      })),
      ...keywords.map((k: string) => ({
        group_type: "keyword",
        group_key: k,
        is_active: true,
      })),
    ];

    if (groupsToUpsert.length > 0) {
      await admin
        .from("interest_groups")
        .upsert(groupsToUpsert, { onConflict: "group_type,group_key", ignoreDuplicates: true });
    }

    // 3. 뉴스 수집 (최근 1시간 내 수집 이력 없을 때만)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await admin
      .from("articles")
      .select("*", { count: "exact", head: true })
      .gte("collected_at", oneHourAgo);

    let collectResult = { collected: 0, skipped: 0 };
    if ((recentCount ?? 0) < 10) {
      collectResult = await collectNews();
    }

    // 4. 요약 생성 (오늘 미생성 그룹만)
    const summaryResults = await generateSummaries();
    const succeeded = summaryResults.filter((r) => r.success).length;
    const failed = summaryResults.filter((r) => !r.success);

    return NextResponse.json({
      success: true,
      collected: collectResult.collected,
      skipped: collectResult.skipped,
      summariesTotal: summaryResults.length,
      summariesSucceeded: succeeded,
      summariesFailed: failed.length,
      failures: failed.map((f) => ({ topic: f.topic, error: f.error })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Briefing generation failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
