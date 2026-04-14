import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: summary, error } = await supabase
    .from("summaries")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !summary) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 원문 기사 정보 조회
  let articles: any[] = [];
  if (summary.article_ids?.length > 0) {
    const { data } = await supabase
      .from("articles")
      .select("id, title, source_name, source_url, image_url, published_at")
      .in("id", summary.article_ids);
    articles = data ?? [];
  }

  // 북마크/피드백 상태
  const [bookmarkRes, feedbackRes] = await Promise.all([
    supabase.from("bookmarks").select("id").eq("user_id", user.id).eq("summary_id", params.id).maybeSingle(),
    supabase.from("feedback").select("is_positive").eq("user_id", user.id).eq("summary_id", params.id).maybeSingle(),
  ]);

  return NextResponse.json({
    summary,
    articles,
    is_bookmarked: !!bookmarkRes.data,
    user_feedback: feedbackRes.data?.is_positive ?? null,
  });
}
