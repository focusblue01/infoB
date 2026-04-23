"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Users, Tag, Rss } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

interface Props {
  rssCount: number;
  userCount: number;
  groupCount: number;
  articleCount: number;
}

export function AdminDashboardClient({ rssCount, userCount, groupCount, articleCount }: Props) {
  const { t } = useLanguage();

  const stats = [
    { label: t.adminNavRss, value: rssCount, icon: Database, href: "/admin/rss" },
    { label: t.adminNavUsers, value: userCount, icon: Users, href: "/admin/users" },
    { label: t.adminNavCategories, value: groupCount, icon: Tag, href: "/admin/categories" },
    { label: "Articles", value: articleCount, icon: Rss, href: null },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.adminDashboard}</h1>
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
