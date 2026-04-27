import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { generateSummaries } from "@/lib/ai/summarizer";
import { getKSTDateString } from "@/lib/date";

export const maxDuration = 300;

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// 지정된 KST 날짜(기본: 오늘) 자 brefings(summaries) 를 모두 삭제 후 재생성
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  let date = getKSTDateString();
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.date === "string" && isValidDate(body.date)) date = body.date;
  } catch {
    // ignore
  }

  try {
    const { error: delErr, count } = await supabase
      .from("summaries")
      .delete({ count: "exact" })
      .eq("briefing_date", date);

    if (delErr) {
      return NextResponse.json({ success: false, error: delErr.message }, { status: 500 });
    }

    const results = await generateSummaries({ targetDate: date });
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      deleted: count ?? 0,
      total: results.length,
      succeeded,
      failed,
      failures: results.filter((r) => !r.success).map((r) => ({ topic: r.topic, error: r.error })),
      briefingDate: date,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
