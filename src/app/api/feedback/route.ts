import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { summary_id, is_positive } = await request.json();

  const { data, error } = await supabase
    .from("feedback")
    .upsert(
      { user_id: user.id, summary_id, is_positive },
      { onConflict: "user_id,summary_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ feedback: data });
}
