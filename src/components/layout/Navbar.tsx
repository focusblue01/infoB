"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Newspaper, Bookmark, Settings, LogOut, Menu, X, Flame, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/language-context";

interface NavbarProps {
  userName?: string | null;
  streakCount?: number;
  isAdmin?: boolean;
}

export function Navbar({ userName, streakCount = 0, isAdmin = false }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { language, setLanguage, t } = useLanguage();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const navLinks = [
    { href: "/feed", label: t.navFeed, icon: Newspaper },
    { href: "/bookmarks", label: t.navBookmarks, icon: Bookmark },
    { href: "/settings", label: t.navSettings, icon: Settings },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <nav className="nav-scale-lock sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-5xl flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Newspaper className="h-5 w-5 text-primary" />
            <span className="sm:hidden">infoB</span>
            <span className="hidden sm:inline">InfoB</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {streakCount > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-sm font-medium text-orange-500">
              <Flame className="h-4 w-4" />
              {t.streak(streakCount)}
            </div>
          )}
          {userName && (
            <span className="hidden sm:block text-sm text-muted-foreground">{userName}</span>
          )}
          {/* KO/EN 언어 스위치 */}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold transition-colors ${language === "ko" ? "text-foreground" : "text-muted-foreground"}`}>
              KO
            </span>
            <Switch
              checked={language === "en"}
              onCheckedChange={(checked) => setLanguage(checked ? "en" : "ko")}
              aria-label={t.langLabel}
            />
            <span className={`text-xs font-semibold transition-colors ${language === "en" ? "text-foreground" : "text-muted-foreground"}`}>
              EN
            </span>
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleLogout} className="hidden md:flex">
            <LogOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {mobileOpen && (
        <div className="md:hidden border-t p-4 space-y-2 bg-background">
          {streakCount > 0 && (
            <div className="flex items-center gap-1 text-sm font-medium text-orange-500 pb-2">
              <Flame className="h-4 w-4" />
              {t.streakMobile(streakCount)}
            </div>
          )}
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <link.icon className="h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          ))}
          <Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            {t.navLogout}
          </Button>
        </div>
      )}
    </nav>
  );
}
