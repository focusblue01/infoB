import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const [groupsRes, catRes, kwRes] = await Promise.all([
    supabase
      .from("interest_groups")
      .select("*")
      .order("group_type", { ascending: true }),
    supabase.from("user_categories").select("category"),
    supabase.from("user_keywords").select("keyword").eq("is_exclude", false),
  ]);

  if (groupsRes.error) return NextResponse.json({ error: groupsRes.error.message }, { status: 500 });

  // 실시간 구독자 수 집계
  const catCount = new Map<string, number>();
  for (const r of catRes.data ?? []) {
    const k = (r as any).category;
    catCount.set(k, (catCount.get(k) ?? 0) + 1);
  }
  const kwCount = new Map<string, number>();
  for (const r of kwRes.data ?? []) {
    const k = (r as any).keyword;
    kwCount.set(k, (kwCount.get(k) ?? 0) + 1);
  }

  const groups = (groupsRes.data ?? []).map((g: any) => {
    const live =
      g.group_type === "category"
        ? catCount.get(g.group_key) ?? 0
        : // 키워드: 본 키워드 + similar_keywords 구독자 합산
          (kwCount.get(g.group_key) ?? 0) +
          (g.similar_keywords ?? []).reduce(
            (acc: number, s: string) => acc + (kwCount.get(s) ?? 0),
            0
          );
    // 미사용 키워드(브리핑 생성 중단) 여부: 키워드 그룹이고 비활성
    const unused = g.group_type === "keyword" && !g.is_active;
    return { ...g, subscriber_count: live, unused };
  });

  // 구독자 수 내림차순 정렬 (그룹타입 유지)
  groups.sort((a: any, b: any) => {
    if (a.group_type !== b.group_type) return a.group_type < b.group_type ? -1 : 1;
    return b.subscriber_count - a.subscriber_count;
  });

  return NextResponse.json({ groups });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const body = await request.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (Array.isArray(body.similar_keywords)) {
    updates.similar_keywords = body.similar_keywords.filter(
      (k: unknown) => typeof k === "string" && k.trim().length > 0
    );
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no valid fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("interest_groups")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ group: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("interest_groups").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
