import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const adminSupabase = (await import("@/lib/supabase/admin")).createAdminClient();

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

  return NextResponse.json({ success: true });
}

// PUT: 관심사 수정
export async function PUT(request: Request) {
  // POST와 동일 로직 재사용
  return POST(request);
}
