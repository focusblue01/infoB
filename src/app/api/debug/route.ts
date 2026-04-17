import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getKSTDateString } from "@/lib/date";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const today = getKSTDateString();

  const [
    { data: categories },
    { data: keywords },
    { data: allGroups },
    { data: allSummaries },
    { count: articleCount },
  ] = await Promise.all([
    admin.from("user_categories").select("category").eq("user_id", user.id),
    admin.from("user_keywords").select("keyword, is_exclude").eq("user_id", user.id),
    admin.from("interest_groups").select("*"),
    admin.from("summaries").select("id, title, interest_group_id, briefing_date, created_at").order("created_at", { ascending: false }).limit(10),
    admin.from("articles").select("*", { count: "exact", head: true }),
  ]);

  const userCats = (categories ?? []).map((c: any) => c.category);
  const userKws = (keywords ?? []).filter((k: any) => !k.is_exclude).map((k: any) => k.keyword);
  const allGroupKeys = (allGroups ?? []).map((g: any) => g.group_key);

  const userGroupIds = (allGroups ?? [])
    .filter((g: any) => [...userCats, ...userKws].includes(g.group_key))
    .map((g: any) => g.id);

  const todaySummaries = (allSummaries ?? []).filter(
    (s: any) => s.briefing_date === today && userGroupIds.includes(s.interest_group_id)
  );

  return NextResponse.json({
    kstToday: today,
    user: { id: user.id, email: user.email },
    userCategories: userCats,
    userKeywords: userKws,
    allInterestGroups: allGroups,
    userMatchingGroupIds: userGroupIds,
    totalArticles: articleCount,
    recentSummaries: allSummaries,
    todaySummariesForUser: todaySummaries,
  });
}
