import { createClient } from "@/lib/supabase/server";
import { LandingLoggedOut } from "@/components/landing/LandingLoggedOut";
import { LandingLoggedIn } from "@/components/landing/LandingLoggedIn";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <LandingLoggedOut />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, streak_count, role")
    .eq("id", user.id)
    .single();

  return (
    <LandingLoggedIn
      displayName={profile?.display_name ?? null}
      streakCount={profile?.streak_count ?? 0}
      isAdmin={profile?.role === "A"}
    />
  );
}
