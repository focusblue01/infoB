"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface RssSource {
  name: string;
  url: string;
}

interface RssSourceInputProps {
  sources: RssSource[];
  onChange: (sources: RssSource[]) => void;
}

export function RssSourceInput({ sources, onChange }: RssSourceInputProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const { t } = useLanguage();

  function add() {
    if (!name.trim() || !url.trim()) return;
    if (sources.some((s) => s.url === url.trim())) return;
    onChange([...sources, { name: name.trim(), url: url.trim() }]);
    setName("");
    setUrl("");
  }

  function remove(targetUrl: string) {
    onChange(sources.filter((s) => s.url !== targetUrl));
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{t.rssSourcesLabel}</label>
      <div className="flex gap-2">
        <Input
          placeholder={t.sourceNamePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-1/3"
        />
        <Input
          placeholder={t.rssUrlPlaceholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Button type="button" size="icon" variant="outline" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {sources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sources.map((s) => (
            <Badge key={s.url} variant="secondary" className="gap-1 cursor-pointer" onClick={() => remove(s.url)}>
              {s.name}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
