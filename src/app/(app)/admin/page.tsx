import { createAdminClient } from "@/lib/supabase/admin";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  const [rssRes, usersRes, groupsRes, articlesRes] = await Promise.all([
    supabase.from("rss_sources").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("interest_groups").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("articles").select("id", { count: "exact", head: true }),
  ]);

  return (
    <AdminDashboardClient
      rssCount={rssRes.count ?? 0}
      userCount={usersRes.count ?? 0}
      groupCount={groupsRes.count ?? 0}
      articleCount={articlesRes.count ?? 0}
    />
  );
}
