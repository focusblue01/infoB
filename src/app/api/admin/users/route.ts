import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, onboarding_completed, streak_count, last_read_date, notification_enabled, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // auth.users에서 이메일 조회
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map((authData?.users ?? []).map((u: any) => [u.id, u.email]));

  const users = (profiles ?? []).map((p: any) => ({
    ...p,
    email: emailMap.get(p.id) ?? null,
  }));

  return NextResponse.json({ users });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { id, role } = await request.json();
  if (!id || !role) return NextResponse.json({ error: "id and role required" }, { status: 400 });

  const validRoles = ["A", "T", "N", "R", "S"];
  if (!validRoles.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (id === user.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  const { error: authErr } = await supabase.auth.admin.deleteUser(id);
  if (authErr && !/not.*found/i.test(authErr.message)) {
    return NextResponse.json({ error: authErr.message }, { status: 500 });
  }

  await supabase.from("profiles").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
