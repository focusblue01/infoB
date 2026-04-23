"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Trash2, Users } from "lucide-react";
import { CATEGORY_LABELS, type NewsCategory } from "@/types";
import { useLanguage } from "@/lib/language-context";

interface InterestGroup {
  id: string;
  group_type: "category" | "keyword";
  group_key: string;
  similar_keywords: string[];
  subscriber_count: number;
  is_active: boolean;
}

export default function AdminCategoriesPage() {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<InterestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { fetchGroups(); }, []);

  async function fetchGroups() {
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    setGroups(data.groups ?? []);
    setLoading(false);
  }

  async function toggleActive(group: InterestGroup) {
    setSaving(group.id);
    await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: group.id, is_active: !group.is_active }),
    });
    setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, is_active: !g.is_active } : g));
    setSaving(null);
  }

  async function deleteGroup(id: string) {
    if (!confirm(t.adminDeleteGroupConfirm)) return;
    setSaving(id);
    await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setSaving(null);
  }

  const categoryGroups = groups.filter((g) => g.group_type === "category");
  const keywordGroups = groups.filter((g) => g.group_type === "keyword");

  function GroupList({ items, title }: { items: InterestGroup[]; title: string }) {
    return (
      <div className="space-y-2">
        <h2 className="text-base font-semibold">
          {title} <span className="text-muted-foreground font-normal text-sm">({items.length})</span>
        </h2>
        <div className="rounded-lg border divide-y">
          {items.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted-foreground">{t.adminNoItems}</p>
          )}
          {items.map((group) => (
            <div key={group.id} className={`flex items-center gap-3 px-4 py-3 ${!group.is_active ? "opacity-50" : ""}`}>
              <Switch
                checked={group.is_active}
                onCheckedChange={() => toggleActive(group)}
                disabled={saving === group.id}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {group.group_type === "category" ? (
                    <Badge variant="secondary">
                      {t.categoryLabels[group.group_key as NewsCategory] ?? group.group_key}
                    </Badge>
                  ) : (
                    <span className="text-sm font-medium">{group.group_key}</span>
                  )}
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />{group.subscriber_count}
                  </span>
                </div>
                {group.similar_keywords?.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    ~{group.similar_keywords.join(", ")}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteGroup(group.id)}
                disabled={saving === group.id}
                className="shrink-0 text-destructive hover:text-destructive"
              >
                {saving === group.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.adminNavCategories}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t.adminActiveGroups(groups.filter((g) => g.is_active).length, groups.length)}
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
        </div>
      ) : (
        <div className="space-y-8">
          <GroupList items={categoryGroups} title={t.adminCategoryGroups} />
          <GroupList items={keywordGroups} title={t.adminKeywordGroups} />
        </div>
      )}
    </div>
  );
}
