import { NextResponse } from "next/server";
import { collectNews } from "@/lib/news/collector";

export const maxDuration = 60;

export async function POST(request: Request) {
  // CRON_SECRET 검증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await collectNews();
    return NextResponse.json({
      success: true,
      collected: result.collected,
      skipped: result.skipped,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("News collection failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
