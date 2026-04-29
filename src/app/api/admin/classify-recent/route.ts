import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { classifyRecentUncategorized } from "@/lib/ai/classify-recent";

export const maxDuration = 300;

export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const result = await classifyRecentUncategorized();
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
