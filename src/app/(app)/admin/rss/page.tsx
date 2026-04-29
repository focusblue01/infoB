"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Loader2, Pencil, Check, X, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { CATEGORY_LABELS, type NewsCategory } from "@/types";
import { useLanguage } from "@/lib/language-context";

interface RssSource {
  id: string;
  name: string;
  url: string;
  category: string | null;
  priority: number;
  is_active: boolean;
  last_fetched_at?: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
  consecutive_failures?: number | null;
  last_item_count?: number | null;
  last_response_ms?: number | null;
}

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [NewsCategory, string][];

export default function AdminRssPage() {
  const { t } = useLanguage();
  const [sources, setSources] = useState<RssSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", category: "", priority: "10" });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", url: "", category: "", priority: "10" });
  const [problemOnly, setProblemOnly] = useState(false);

  useEffect(() => { fetchSources(); }, []);

  async function fetchSources() {
    const res = await fetch("/api/admin/rss");
    const data = await res.json();
    setSources(data.sources ?? []);
    setLoading(false);
  }

  async function toggleActive(source: RssSource) {
    setSaving(source.id);
    await fetch("/api/admin/rss", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: source.id, is_active: !source.is_active }),
    });
    setSources((prev) => prev.map((s) => s.id === source.id ? { ...s, is_active: !s.is_active } : s));
    setSaving(null);
  }

  async function deleteSource(id: string) {
    if (!confirm(t.adminDeleteRssConfirm)) return;
    setSaving(id);
    await fetch(`/api/admin/rss?id=${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
    setSaving(null);
  }

  async function addSource() {
    if (!form.name || !form.url) return;
    setAdding(true);
    const res = await fetch("/api/admin/rss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        url: form.url,
        category: form.category || null,
        priority: parseInt(form.priority) || 10,
      }),
    });
    const data = await res.json();
    if (data.source) {
      setSources((prev) => [...prev, data.source]);
      setForm({ name: "", url: "", category: "", priority: "10" });
    }
    setAdding(false);
  }

  function startEdit(source: RssSource) {
    setEditingId(source.id);
    setEditForm({
      name: source.name,
      url: source.url,
      category: source.category ?? "",
      priority: String(source.priority),
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    if (!editForm.name || !editForm.url) return;
    setSaving(id);
    const res = await fetch("/api/admin/rss", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: editForm.name,
        url: editForm.url,
        category: editForm.category || null,
        priority: parseInt(editForm.priority) || 10,
      }),
    });
    const data = await res.json();
    if (data.source) {
      setSources((prev) => prev.map((s) => s.id === id ? data.source : s));
      setEditingId(null);
    }
    setSaving(null);
  }

  const activeCount = sources.filter((s) => s.is_active).length;

  // 문제 소스 판정: 마지막 에러 있음 OR 연속 실패 ≥ 1 OR 마지막 수집 후 항목 0
  function isProblem(s: RssSource): boolean {
    if ((s.consecutive_failures ?? 0) >= 1) return true;
    if (s.last_error) return true;
    if (s.last_fetched_at && (s.last_item_count ?? 0) === 0) return true;
    return false;
  }
  const problemCount = sources.filter(isProblem).length;

  function statusBadge(s: RssSource) {
    if (!s.last_fetched_at) {
      return (
        <Badge variant="outline" className="text-xs gap-1">
          <Clock className="h-3 w-3" />
          unfetched
        </Badge>
      );
    }
    if ((s.consecutive_failures ?? 0) >= 1 || s.last_error) {
      return (
        <Badge variant="destructive" className="text-xs gap-1">
          <AlertTriangle className="h-3 w-3" />
          fail × {s.consecutive_failures ?? 1}
        </Badge>
      );
    }
    if ((s.last_item_count ?? 0) === 0) {
      return (
        <Badge variant="outline" className="text-xs gap-1 border-yellow-500 text-yellow-600">
          <AlertTriangle className="h-3 w-3" />
          empty
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs gap-1 border-emerald-500 text-emerald-600">
        <CheckCircle2 className="h-3 w-3" />
        {s.last_item_count ?? 0} items · {s.last_response_ms ?? 0}ms
      </Badge>
    );
  }

  const visibleSources = problemOnly ? sources.filter(isProblem) : sources;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t.adminNavRss}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t.adminActiveRss(activeCount, sources.length)}
            {problemCount > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {t.adminProblemSources(problemCount)}
              </span>
            )}
          </p>
        </div>
        <label className="text-sm flex items-center gap-2 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={problemOnly}
            onChange={(e) => setProblemOnly(e.target.checked)}
          />
          {t.adminProblemOnly}
        </label>
      </div>

      {/* Add new source */}
      <div className="rounded-lg border p-3 md:p-4 space-y-3">
        <p className="text-sm font-semibold">{t.adminAddSource}</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <Input placeholder={t.adminSourceName} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input placeholder="RSS URL" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="h-10 w-full sm:w-44 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{t.adminNoCategory}</option>
            {CATEGORIES.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <Input
            type="number"
            placeholder={t.adminPriority}
            className="w-24 sm:w-28"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
          />
          <Button onClick={addSource} disabled={adding || !form.name || !form.url} className="gap-1 flex-1 sm:flex-none">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t.adminAdd}
          </Button>
        </div>
      </div>

      {/* Source list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {visibleSources.map((source) => {
            const isEditing = editingId === source.id;
            if (isEditing) {
              return (
                <div key={source.id} className="p-3 space-y-2 bg-muted/30">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Input
                      placeholder={t.adminSourceName}
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    <Input
                      placeholder="RSS URL"
                      value={editForm.url}
                      onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                      className="h-10 w-full sm:w-44 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">{t.adminNoCategory}</option>
                      {CATEGORIES.map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      placeholder={t.adminPriority}
                      className="w-24 sm:w-28"
                      value={editForm.priority}
                      onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
                    />
                    <Button
                      onClick={() => saveEdit(source.id)}
                      disabled={saving === source.id || !editForm.name || !editForm.url}
                      size="sm"
                      className="gap-1"
                    >
                      {saving === source.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {t.adminSave}
                    </Button>
                    <Button onClick={cancelEdit} variant="outline" size="sm" className="gap-1">
                      <X className="h-4 w-4" />
                      {t.adminCancel}
                    </Button>
                  </div>
                </div>
              );
            }
            return (
              <div key={source.id} className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-3 ${!source.is_active ? "opacity-50" : ""}`}>
                <Switch
                  checked={source.is_active}
                  onCheckedChange={() => toggleActive(source)}
                  disabled={saving === source.id}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{source.name}</span>
                    {source.category && (
                      <Badge variant="secondary" className="text-xs">
                        {t.categoryLabels[source.category as NewsCategory] ?? source.category}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">P{source.priority}</span>
                    {statusBadge(source)}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{source.url}</p>
                  {source.last_error && (
                    <p className="text-xs text-destructive truncate">
                      {source.last_error}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startEdit(source)}
                  disabled={saving === source.id}
                  className="shrink-0 h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteSource(source.id)}
                  disabled={saving === source.id}
                  className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
                >
                  {saving === source.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
