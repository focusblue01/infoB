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
    <aside className="md:w-48 shrink-0 md:pt-2">
      <p className="hidden md:block text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
        {t.adminNav}
      </p>
      <nav className="flex md:flex-col overflow-x-auto md:overflow-visible gap-1 md:gap-0 md:space-y-0.5 -mx-2 px-2 md:mx-0 md:px-0 pb-1 md:pb-0">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 md:gap-2 rounded-md px-2.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm transition-colors whitespace-nowrap shrink-0 ${
                active ? "bg-muted font-medium" : "hover:bg-muted"
              }`}
            >
              <item.icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
