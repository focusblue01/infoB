import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // signup | recovery | invite | magiclink | ...
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      // 이메일 인증으로 처음 확정된 신규 가입자는 /welcome 으로 안내.
      //   기준: ?type=signup 또는 email_confirmed_at 이 60초 이내(즉 방금 확인됨)
      const justConfirmed = (() => {
        if (type === "signup") return true;
        const ts = user?.email_confirmed_at;
        if (!ts) return false;
        const diff = Date.now() - new Date(ts).getTime();
        return diff >= 0 && diff < 60_000;
      })();

      if (justConfirmed) {
        return NextResponse.redirect(`${origin}/welcome`);
      }

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        if (profile?.onboarding_completed) {
          return NextResponse.redirect(`${origin}/feed`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 코드 교환 실패: 가입 인증 흐름이라면 친화 페이지로 안내
  if (type === "signup" || searchParams.get("from") === "signup") {
    return NextResponse.redirect(`${origin}/welcome?already=1`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
