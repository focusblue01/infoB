import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { generateSummaries } from "@/lib/ai/summarizer";
import { getKSTDateString } from "@/lib/date";

export const maxDuration = 300;

// 오늘(KST) 자 모든 브리핑(summaries)을 삭제 후 재생성
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  try {
    const today = getKSTDateString();

    // 오늘자 summaries 전체 삭제 (의존 row: bookmarks/feedback 는 FK 가
    // 없으므로 안전. 만약 향후 FK 가 추가되면 여기서 cascade 처리 필요)
    const { error: delErr, count } = await supabase
      .from("summaries")
      .delete({ count: "exact" })
      .eq("briefing_date", today);

    if (delErr) {
      return NextResponse.json({ success: false, error: delErr.message }, { status: 500 });
    }

    const results = await generateSummaries();
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      deleted: count ?? 0,
      total: results.length,
      succeeded,
      failed,
      failures: results.filter((r) => !r.success).map((r) => ({ topic: r.topic, error: r.error })),
      briefingDate: today,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
