"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Newspaper, Bookmark, Settings, LogOut, Menu, X, Flame } from "lucide-react";
import { useState } from "react";

interface NavbarProps {
  userName?: string | null;
  streakCount?: number;
}

export function Navbar({ userName, streakCount = 0 }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const navLinks = [
    { href: "/feed", label: "피드", icon: Newspaper },
    { href: "/bookmarks", label: "북마크", icon: Bookmark },
    { href: "/settings", label: "설정", icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-5xl flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/feed" className="flex items-center gap-2 font-bold text-lg">
            <Newspaper className="h-5 w-5 text-primary" />
            <span className="hidden sm:inline">Daily News Digest</span>
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
              {streakCount}일 연속
            </div>
          )}
          {userName && (
            <span className="hidden sm:block text-sm text-muted-foreground">{userName}</span>
          )}
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
              {streakCount}일 연속 읽기 중
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
            로그아웃
          </Button>
        </div>
      )}
    </nav>
  );
}
