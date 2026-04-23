import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Users, Tag, Rss } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  const [rssRes, usersRes, groupsRes, articlesRes] = await Promise.all([
    supabase.from("rss_sources").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("interest_groups").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("articles").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Active RSS Sources", value: rssRes.count ?? 0, icon: Database, href: "/admin/rss" },
    { label: "Total Users", value: usersRes.count ?? 0, icon: Users, href: "/admin/users" },
    { label: "Active Interest Groups", value: groupsRes.count ?? 0, icon: Tag, href: "/admin/categories" },
    { label: "Total Articles", value: articlesRes.count ?? 0, icon: Rss, href: null },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className={s.href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}>
            {s.href ? (
              <Link href={s.href}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{s.value.toLocaleString()}</p>
                </CardContent>
              </Link>
            ) : (
              <>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{s.value.toLocaleString()}</p>
                </CardContent>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
