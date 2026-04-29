import { NextResponse } from "next/server";
import { classifyRecentUncategorized } from "@/lib/ai/classify-recent";

export const maxDuration = 300;

// CRON_SECRET 으로 보호되는 백그라운드 AI 분류 엔드포인트.
// cron-job.org 등에서 collect 후 5-10분 뒤 호출하도록 스케줄링한다.
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await classifyRecentUncategorized();
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error("AI classify cron failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
