"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Trash2, Users, Pencil, Check, X, Plus, GitMerge } from "lucide-react";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSimilar, setEditSimilar] = useState<string[]>([]);
  const [newSimInput, setNewSimInput] = useState("");
  const [mergingId, setMergingId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");

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

  function startEdit(group: InterestGroup) {
    setEditingId(group.id);
    setEditSimilar(group.similar_keywords ?? []);
    setNewSimInput("");
    setMergingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditSimilar([]);
    setNewSimInput("");
  }

  function addSimilar() {
    const kw = newSimInput.trim();
    if (!kw) return;
    if (/\s/.test(kw)) return;
    if (editSimilar.includes(kw)) {
      setNewSimInput("");
      return;
    }
    setEditSimilar((prev) => [...prev, kw]);
    setNewSimInput("");
  }

  function removeSimilar(kw: string) {
    setEditSimilar((prev) => prev.filter((k) => k !== kw));
  }

  async function saveSimilar(id: string) {
    setSaving(id);
    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, similar_keywords: editSimilar }),
    });
    if (res.ok) {
      setGroups((prev) => prev.map((g) => g.id === id ? { ...g, similar_keywords: editSimilar } : g));
      setEditingId(null);
    }
    setSaving(null);
  }

  function startMerge(id: string) {
    setMergingId(id);
    setMergeTargetId("");
    setEditingId(null);
  }

  function cancelMerge() {
    setMergingId(null);
    setMergeTargetId("");
  }

  async function doMerge(sourceId: string) {
    if (!mergeTargetId || mergeTargetId === sourceId) return;
    const source = groups.find((g) => g.id === sourceId);
    const target = groups.find((g) => g.id === mergeTargetId);
    if (!source || !target) return;
    if (!confirm(t.adminMergeConfirm(source.group_key, target.group_key))) return;
    setSaving(sourceId);
    const res = await fetch("/api/admin/categories/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, targetId: mergeTargetId }),
    });
    if (res.ok) {
      await fetchGroups();
      setMergingId(null);
      setMergeTargetId("");
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Merge failed");
    }
    setSaving(null);
  }

  const categoryGroups = groups.filter((g) => g.group_type === "category");
  const keywordGroups = groups.filter((g) => g.group_type === "keyword");

  function GroupRow({ group }: { group: InterestGroup }) {
    const isEditing = editingId === group.id;
    const isMerging = mergingId === group.id;
    const isKeyword = group.group_type === "keyword";

    if (isEditing && isKeyword) {
      return (
        <div className="p-3 space-y-2 bg-muted/30">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{group.group_key}</span>
            <span className="text-xs text-muted-foreground">{t.adminSimilarKeywords}</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={t.adminSimilarKeywordPlaceholder}
              value={newSimInput}
              onChange={(e) => setNewSimInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addSimilar(); }
              }}
              className="flex-1"
            />
            <Button size="sm" variant="outline" onClick={addSimilar} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {editSimilar.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {editSimilar.map((kw) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="gap-1 cursor-pointer"
                  onClick={() => removeSimilar(kw)}
                >
                  {kw}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveSimilar(group.id)} disabled={saving === group.id} className="gap-1">
              {saving === group.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {t.adminSave}
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEdit} className="gap-1">
              <X className="h-3.5 w-3.5" />
              {t.adminCancel}
            </Button>
          </div>
        </div>
      );
    }

    if (isMerging && isKeyword) {
      const targets = keywordGroups.filter((g) => g.id !== group.id);
      return (
        <div className="p-3 space-y-2 bg-muted/30">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{group.group_key}</span>
            <span className="text-xs text-muted-foreground">→ {t.adminMergeInto}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              className="h-9 flex-1 min-w-0 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t.adminSelectTarget}</option>
              {targets.map((g) => (
                <option key={g.id} value={g.id}>{g.group_key}</option>
              ))}
            </select>
            <Button size="sm" onClick={() => doMerge(group.id)} disabled={!mergeTargetId || saving === group.id} className="gap-1">
              {saving === group.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5" />}
              {t.adminMerge}
            </Button>
            <Button size="sm" variant="outline" onClick={cancelMerge} className="gap-1">
              <X className="h-3.5 w-3.5" />
              {t.adminCancel}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-3 ${!group.is_active ? "opacity-50" : ""}`}>
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
        {isKeyword && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => startEdit(group)}
              disabled={saving === group.id}
              className="shrink-0 h-8 w-8"
              title={t.adminEditSimilar}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => startMerge(group.id)}
              disabled={saving === group.id}
              className="shrink-0 h-8 w-8"
              title={t.adminMergeInto}
            >
              <GitMerge className="h-4 w-4" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => deleteGroup(group.id)}
          disabled={saving === group.id}
          className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
        >
          {saving === group.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

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
          {items.map((group) => <GroupRow key={group.id} group={group} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{t.adminNavCategories}</h1>
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
