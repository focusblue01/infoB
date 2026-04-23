import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "A") redirect("/feed");

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-3.5rem)] gap-3 md:gap-6">
      <AdminSidebar />
      <main className="flex-1 min-w-0 md:pt-2">{children}</main>
    </div>
  );
}
