"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, Users, Tag, LayoutDashboard } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export function AdminSidebar() {
  const { t } = useLanguage();
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: t.adminNavDashboard, icon: LayoutDashboard, exact: true },
    { href: "/admin/rss", label: t.adminNavRss, icon: Database, exact: false },
    { href: "/admin/users", label: t.adminNavUsers, icon: Users, exact: false },
    { href: "/admin/categories", label: t.adminNavCategories, icon: Tag, exact: false },
  ];

  return (
    <aside className="w-48 shrink-0 pt-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
        {t.adminNav}
      </p>
      <nav className="space-y-0.5">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? "bg-muted font-medium" : "hover:bg-muted"
              }`}
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
