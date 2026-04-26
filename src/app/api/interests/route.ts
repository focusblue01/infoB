import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectNews } from "@/lib/news/collector";
import { generateSummaries } from "@/lib/ai/summarizer";

export const maxDuration = 300;

// GET: 사용자 관심사 조회
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [categoriesRes, keywordsRes] = await Promise.all([
    supabase.from("user_categories").select("*").eq("user_id", user.id),
    supabase.from("user_keywords").select("*").eq("user_id", user.id),
  ]);

  return NextResponse.json({
    categories: categoriesRes.data ?? [],
    keywords: (keywordsRes.data ?? []).filter((k: any) => !k.is_exclude),
    excludeKeywords: (keywordsRes.data ?? []).filter((k: any) => k.is_exclude),
  });
}

// POST: 관심사 설정 (온보딩 완료)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { categories, keywords, excludeKeywords, rssSources } = body;

  // 기존 데이터 삭제 후 새로 삽입
  await Promise.all([
    supabase.from("user_categories").delete().eq("user_id", user.id),
    supabase.from("user_keywords").delete().eq("user_id", user.id),
    supabase.from("user_sources").delete().eq("user_id", user.id),
  ]);

  // 카테고리 삽입
  if (categories?.length) {
    await supabase.from("user_categories").insert(
      categories.map((c: string) => ({ user_id: user.id, category: c }))
    );
  }

  // 키워드 삽입 (포함)
  if (keywords?.length) {
    await supabase.from("user_keywords").insert(
      keywords.map((k: string) => ({ user_id: user.id, keyword: k, is_exclude: false }))
    );
  }

  // 키워드 삽입 (제외)
  if (excludeKeywords?.length) {
    await supabase.from("user_keywords").insert(
      excludeKeywords.map((k: string) => ({ user_id: user.id, keyword: k, is_exclude: true }))
    );
  }

  // RSS 소스 삽입
  if (rssSources?.length) {
    await supabase.from("user_sources").insert(
      rssSources.map((s: { name: string; url: string }) => ({
        user_id: user.id,
        name: s.name,
        url: s.url,
      }))
    );
  }

  // interest_groups 업데이트 (관심사 그룹 자동 생성/구독자 수 갱신)
  const adminSupabase = createAdminClient();

  // 신규 키워드(유사 키워드 포함 DB 미존재) 식별 — upsert 이전 시점 기준
  const inputKeywords: string[] = (keywords ?? []) as string[];
  const lowerInputKeywords = inputKeywords.map((k) => k.toLowerCase());
  let trulyNewKeywords: string[] = [];
  if (lowerInputKeywords.length > 0) {
    const { data: existingKeywordGroups } = await adminSupabase
      .from("interest_groups")
      .select("group_key, similar_keywords")
      .eq("group_type", "keyword");

    const existingSet = new Set<string>();
    for (const g of existingKeywordGroups ?? []) {
      if (g.group_key) existingSet.add(String(g.group_key).toLowerCase());
      for (const s of g.similar_keywords ?? []) {
        if (s) existingSet.add(String(s).toLowerCase());
      }
    }
    trulyNewKeywords = inputKeywords.filter(
      (kw) => !existingSet.has(kw.toLowerCase())
    );
  }

  for (const cat of categories ?? []) {
    await adminSupabase.from("interest_groups").upsert(
      { group_type: "category", group_key: cat },
      { onConflict: "group_type,group_key" }
    );
  }
  for (const kw of keywords ?? []) {
    await adminSupabase.from("interest_groups").upsert(
      { group_type: "keyword", group_key: kw },
      { onConflict: "group_type,group_key" }
    );
  }

  // 온보딩 완료 마킹
  await supabase
    .from("profiles")
    .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  // 신규 키워드(DB 첫 등장)에 대해 즉시 브리핑 생성
  let immediateBriefing: {
    triggered: boolean;
    keywords: string[];
    succeeded?: number;
    failed?: number;
    error?: string;
  } = { triggered: false, keywords: [] };

  if (trulyNewKeywords.length > 0) {
    immediateBriefing = { triggered: true, keywords: trulyNewKeywords };
    try {
      // 1) 신규 키워드의 group_id 조회 (방금 upsert 됨)
      const { data: newGroups } = await adminSupabase
        .from("interest_groups")
        .select("id, group_key")
        .eq("group_type", "keyword")
        .in("group_key", trulyNewKeywords);

      const newGroupIds = (newGroups ?? []).map((g: any) => g.id);

      // 2) 새 키워드는 기존 articles 의 matched_keywords 에 포함되지 않을 수 있으므로 수집 먼저 실행
      await collectNews();

      // 3) 해당 그룹들에 한해 요약 생성
      if (newGroupIds.length > 0) {
        const results = await generateSummaries({ onlyGroupIds: newGroupIds });
        immediateBriefing.succeeded = results.filter((r) => r.success).length;
        immediateBriefing.failed = results.filter((r) => !r.success).length;
      }
    } catch (e: any) {
      console.error("Immediate briefing for new keywords failed:", e?.message);
      immediateBriefing.error = e?.message ?? "unknown";
    }
  }

  return NextResponse.json({ success: true, immediateBriefing });
}

// PUT: 관심사 수정
export async function PUT(request: Request) {
  // POST와 동일 로직 재사용
  return POST(request);
}
