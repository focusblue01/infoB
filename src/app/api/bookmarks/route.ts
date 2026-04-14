import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("bookmarks")
    .select("*, summaries(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ bookmarks: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { summary_id } = await request.json();
  const { data, error } = await supabase
    .from("bookmarks")
    .insert({ user_id: user.id, summary_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ bookmark: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const summaryId = searchParams.get("summary_id");
  if (!summaryId) return NextResponse.json({ error: "summary_id 필수" }, { status: 400 });

  await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("summary_id", summaryId);
  return NextResponse.json({ success: true });
}
