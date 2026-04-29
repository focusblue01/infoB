import { createAdminClient } from "@/lib/supabase/admin";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { getKSTDateString } from "@/lib/date";

// 카드 카운트가 라우터 캐시로 인해 stale 표기되는 것을 방지
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  // KST 오늘 00:00 ~ 내일 00:00 의 UTC ISO 범위
  const todayKst = getKSTDateString();
  const [y, m, d] = todayKst.split("-").map(Number);
  const todayStartUtc = new Date(Date.UTC(y, m - 1, d, -9, 0, 0)).toISOString();
  const tomorrowStartUtc = new Date(Date.UTC(y, m - 1, d + 1, -9, 0, 0)).toISOString();

  const [rssRes, usersRes, groupsRes, articlesTotalRes, articlesTodayRes] = await Promise.all([
    supabase.from("rss_sources").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("interest_groups").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("articles").select("id", { count: "exact", head: true }),
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .gte("collected_at", todayStartUtc)
      .lt("collected_at", tomorrowStartUtc),
  ]);

  return (
    <AdminDashboardClient
      rssCount={rssRes.count ?? 0}
      userCount={usersRes.count ?? 0}
      groupCount={groupsRes.count ?? 0}
      articleCount={articlesTotalRes.count ?? 0}
      articleTodayCount={articlesTodayRes.count ?? 0}
    />
  );
}
