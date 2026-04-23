"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Flame } from "lucide-react";
import type { UserRole } from "@/types";
import { useLanguage } from "@/lib/language-context";

interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
  onboarding_completed: boolean;
  streak_count: number;
  last_read_date: string | null;
  notification_enabled: boolean;
  created_at: string;
}

const ROLE_COLORS: Record<UserRole, string> = {
  A: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  T: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  N: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  R: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  S: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  async function updateRole(id: string, role: UserRole) {
    setSaving(id);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u));
    }
    setSaving(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{t.adminNavUsers}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.adminTotalUsers(users.length)}</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{user.display_name ?? "—"}</span>
                  <span className="text-sm text-muted-foreground">{user.email ?? "—"}</span>
                  {user.streak_count > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-orange-500">
                      <Flame className="h-3 w-3" />{user.streak_count}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {t.adminJoined} {new Date(user.created_at).toLocaleDateString()}
                  </span>
                  {!user.onboarding_completed && (
                    <Badge variant="outline" className="text-xs">{t.adminOnboarding}</Badge>
                  )}
                  {user.notification_enabled && (
                    <Badge variant="outline" className="text-xs">{t.adminEmailOn}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={ROLE_COLORS[user.role]}>{t.adminRoleLabels[user.role]}</Badge>
                {saving === user.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <select
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value as UserRole)}
                    className="h-8 w-28 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {(Object.keys(t.adminRoleLabels) as UserRole[]).map((role) => (
                      <option key={role} value={role}>{t.adminRoleLabels[role]}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
