"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { CATEGORY_LABELS, type NewsCategory } from "@/types";

interface RssSource {
  id: string;
  name: string;
  url: string;
  category: string | null;
  priority: number;
  is_active: boolean;
}

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [NewsCategory, string][];

export default function AdminRssPage() {
  const [sources, setSources] = useState<RssSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", category: "", priority: "10" });
  const [adding, setAdding] = useState(false);

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
    if (!confirm("Delete this RSS source?")) return;
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

  const activeCount = sources.filter((s) => s.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">RSS Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">{activeCount} active / {sources.length} total</p>
        </div>
      </div>

      {/* Add new source */}
      <div className="rounded-lg border p-4 space-y-3">
        <p className="text-sm font-semibold">Add New Source</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <Input placeholder="Source name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input placeholder="RSS URL" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
        </div>
        <div className="flex gap-2">
          <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v === "none" ? "" : v }))}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Category (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {CATEGORIES.map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Priority"
            className="w-24"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
          />
          <Button onClick={addSource} disabled={adding || !form.name || !form.url} className="gap-1">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
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
          {sources.map((source) => (
            <div key={source.id} className={`flex items-center gap-3 px-4 py-3 ${!source.is_active ? "opacity-50" : ""}`}>
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
                      {CATEGORY_LABELS[source.category as NewsCategory] ?? source.category}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">P{source.priority}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{source.url}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteSource(source.id)}
                disabled={saving === source.id}
                className="shrink-0 text-destructive hover:text-destructive"
              >
                {saving === source.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
