import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient } from "./client";
import { CATEGORY_LABELS, type NewsCategory } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function buildBriefingHtml(
  userName: string,
  summaries: any[],
  date: string
): string {
  const summaryCards = summaries
    .map((s) => {
      const categoryLabel = s.category ? CATEGORY_LABELS[s.category as NewsCategory] ?? "" : "";
      const preview = s.content.slice(0, 200) + (s.content.length > 200 ? "..." : "");
      return `
        <div style="margin-bottom:20px;padding:16px;border:1px solid #e5e7eb;border-radius:8px;">
          ${categoryLabel ? `<span style="display:inline-block;padding:2px 8px;background:#eff6ff;color:#1d4ed8;border-radius:12px;font-size:12px;margin-bottom:8px;">${categoryLabel}</span>` : ""}
          <h3 style="margin:8px 0 4px;font-size:16px;color:#111827;">${s.title}</h3>
          <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">${preview}</p>
          <a href="${APP_URL}/feed/${s.id}" style="display:inline-block;margin-top:8px;color:#2563eb;font-size:13px;text-decoration:none;">자세히 읽기 &rarr;</a>
        </div>`;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827;">
      <div style="text-align:center;padding:20px 0;border-bottom:2px solid #2563eb;">
        <h1 style="margin:0;font-size:24px;color:#1e3a8a;">InfoB</h1>
        <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">${date} 브리핑</p>
      </div>
      <div style="padding:20px 0;">
        <p style="font-size:15px;">안녕하세요 ${userName}님, 오늘의 브리핑입니다.</p>
        ${summaryCards}
      </div>
      <div style="text-align:center;padding:16px;border-top:1px solid #e5e7eb;">
        <a href="${APP_URL}/feed" style="display:inline-block;padding:10px 24px;background:#2563eb;color:white;border-radius:6px;text-decoration:none;font-size:14px;">전체 브리핑 보기</a>
      </div>
      <div style="text-align:center;padding:16px 0;font-size:12px;color:#9ca3af;">
        <p>이 메일은 InfoB에서 발송되었습니다.</p>
        <a href="${APP_URL}/settings" style="color:#6b7280;">알림 설정 변경</a>
      </div>
    </body>
    </html>`;
}

export async function sendDailyEmails(): Promise<{ sent: number; failed: number }> {
  const supabase = createAdminClient();
  const resend = getResendClient();
  const today = new Date().toISOString().split("T")[0];

  // 알림 활성화된 사용자 조회
  const { data: users } = await supabase
    .from("profiles")
    .select("id, display_name, notification_enabled")
    .eq("notification_enabled", true)
    .eq("onboarding_completed", true);

  if (!users?.length) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      // 사용자 이메일 조회
      const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
      if (!authUser?.user?.email) continue;

      // 사용자 관심사 → 매칭 요약 조회
      const [catRes, kwRes] = await Promise.all([
        supabase.from("user_categories").select("category").eq("user_id", user.id),
        supabase.from("user_keywords").select("keyword").eq("user_id", user.id).eq("is_exclude", false),
      ]);

      const groupKeys = [
        ...(catRes.data ?? []).map((c: any) => c.category),
        ...(kwRes.data ?? []).map((k: any) => k.keyword),
      ];

      if (groupKeys.length === 0) continue;

      const { data: groups } = await supabase
        .from("interest_groups")
        .select("id")
        .in("group_key", groupKeys);

      const groupIds = (groups ?? []).map((g: any) => g.id);
      if (groupIds.length === 0) continue;

      const { data: summaries } = await supabase
        .from("summaries")
        .select("*")
        .in("interest_group_id", groupIds)
        .eq("briefing_date", today);

      if (!summaries?.length) continue;

      const html = buildBriefingHtml(
        user.display_name ?? "사용자",
        summaries,
        today
      );

      await resend.emails.send({
        from: "InfoB <briefing@resend.dev>",
        to: authUser.user.email,
        subject: `[Daily Digest] ${today} 오늘의 브리핑`,
        html,
      });

      sent++;
    } catch (error: any) {
      console.error(`Email send failed for user ${user.id}:`, error.message);
      failed++;
    }
  }

  return { sent, failed };
}
