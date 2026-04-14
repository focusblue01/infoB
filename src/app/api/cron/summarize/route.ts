import { NextResponse } from "next/server";
import { generateSummaries } from "@/lib/ai/summarizer";

export const maxDuration = 300; // 5분 허용 (Pro 플랜)

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await generateSummaries();
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success);

    return NextResponse.json({
      success: true,
      total: results.length,
      succeeded,
      failed: failed.length,
      failures: failed.map((f) => ({ topic: f.topic, error: f.error })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Summary generation failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
