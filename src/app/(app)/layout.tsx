import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { ClientWrapper } from "@/components/layout/ClientWrapper";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, streak_count, onboarding_completed, role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "N") as import("@/types").UserRole;

  // 온보딩 미완료 시 온보딩 페이지로 리다이렉트
  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  return (
    <ClientWrapper role={role}>
      <div className="min-h-screen">
        <Navbar
          userName={profile?.display_name}
          streakCount={profile?.streak_count ?? 0}
          isAdmin={profile?.role === "A"}
        />
        <main className="mx-auto max-w-5xl px-0 md:px-4 py-6">
          {children}
        </main>
      </div>
    </ClientWrapper>
  );
}
