import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { collectNews } from "@/lib/news/collector";

export const maxDuration = 300;

export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const result = await collectNews();
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
