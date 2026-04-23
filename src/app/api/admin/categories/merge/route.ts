import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

// POST: sourceId 키워드 그룹을 targetId로 통합
// - source의 group_key 및 similar_keywords를 target의 similar_keywords에 병합
// - subscriber_count는 target에 합산
// - source는 삭제
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { sourceId, targetId } = await request.json();
  if (!sourceId || !targetId || sourceId === targetId) {
    return NextResponse.json({ error: "invalid sourceId/targetId" }, { status: 400 });
  }

  const { data: groups, error: fetchErr } = await supabase
    .from("interest_groups")
    .select("*")
    .in("id", [sourceId, targetId]);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const source = groups?.find((g) => g.id === sourceId);
  const target = groups?.find((g) => g.id === targetId);
  if (!source || !target) return NextResponse.json({ error: "group not found" }, { status: 404 });
  if (source.group_type !== "keyword" || target.group_type !== "keyword") {
    return NextResponse.json({ error: "only keyword groups can be merged" }, { status: 400 });
  }

  const mergedSimilar = Array.from(
    new Set([
      ...(target.similar_keywords ?? []),
      source.group_key,
      ...(source.similar_keywords ?? []),
    ].filter((k) => k && k !== target.group_key))
  );

  const mergedCount = (target.subscriber_count ?? 0) + (source.subscriber_count ?? 0);

  const { error: updateErr } = await supabase
    .from("interest_groups")
    .update({
      similar_keywords: mergedSimilar,
      subscriber_count: mergedCount,
    })
    .eq("id", targetId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const { error: deleteErr } = await supabase
    .from("interest_groups")
    .delete()
    .eq("id", sourceId);

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, targetId, mergedSimilar });
}
