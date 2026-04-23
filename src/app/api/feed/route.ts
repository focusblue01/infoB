import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getKSTDateString, getKSTYesterday } from "@/lib/date";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? getKSTDateString();

  // 사용자 관심사 조회
  const [catRes, kwRes] = await Promise.all([
    supabase.from("user_categories").select("category").eq("user_id", user.id),
    supabase.from("user_keywords").select("keyword").eq("user_id", user.id).eq("is_exclude", false),
  ]);

  const categories = (catRes.data ?? []).map((c: any) => c.category);
  const keywords = (kwRes.data ?? []).map((k: any) => k.keyword);

  // 관심사에 매칭되는 interest_groups 찾기
  const groupKeys = [...categories, ...keywords];
  if (groupKeys.length === 0) {
    return NextResponse.json({ summaries: [], date });
  }

  const { data: groups } = await supabase
    .from("interest_groups")
    .select("id, group_key, group_type")
    .in("group_key", groupKeys);

  const groupIds = (groups ?? []).map((g: any) => g.id);
  if (groupIds.length === 0) {
    return NextResponse.json({ summaries: [], date, missingGroups: [] });
  }

  // 해당 날짜의 요약 조회
  const { data: summaries } = await supabase
    .from("summaries")
    .select("*")
    .in("interest_group_id", groupIds)
    .eq("briefing_date", date)
    .order("created_at", { ascending: false });

  // 북마크 상태 조회
  const summaryIds = (summaries ?? []).map((s: any) => s.id);
  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("summary_id")
    .eq("user_id", user.id)
    .in("summary_id", summaryIds.length > 0 ? summaryIds : ["none"]);

  const bookmarkedIds = new Set((bookmarks ?? []).map((b: any) => b.summary_id));

  // 피드백 조회
  const { data: feedbacks } = await supabase
    .from("feedback")
    .select("summary_id, is_positive")
    .eq("user_id", user.id)
    .in("summary_id", summaryIds.length > 0 ? summaryIds : ["none"]);

  const feedbackMap = new Map((feedbacks ?? []).map((f: any) => [f.summary_id, f.is_positive]));

  const enriched = (summaries ?? []).map((s: any) => ({
    ...s,
    is_bookmarked: bookmarkedIds.has(s.id),
    user_feedback: feedbackMap.has(s.id) ? feedbackMap.get(s.id) : null,
  }));

  // 스트릭 업데이트
  const today = getKSTDateString();
  if (date === today) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("last_read_date, streak_count")
      .eq("id", user.id)
      .single();

    if (profile) {
      const lastRead = profile.last_read_date;
      const yesterday = getKSTYesterday();

      let newStreak = profile.streak_count;
      if (lastRead === yesterday) {
        newStreak += 1;
      } else if (lastRead !== today) {
        newStreak = 1;
      }

      if (lastRead !== today) {
        await supabase.from("profiles").update({
          last_read_date: today,
          streak_count: newStreak,
          updated_at: new Date().toISOString(),
        }).eq("id", user.id);
      }
    }
  }

  // 브리핑이 생성된 그룹 ID 집합
  const summaryGroupIds = new Set((summaries ?? []).map((s: any) => s.interest_group_id));
  const missingGroups = (groups ?? [])
    .filter((g: any) => !summaryGroupIds.has(g.id))
    .map((g: any) => ({ key: g.group_key, type: g.group_type }));

  return NextResponse.json({ summaries: enriched, date, missingGroups });
}
