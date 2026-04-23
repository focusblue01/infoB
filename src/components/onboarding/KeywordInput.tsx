"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { MAX_KEYWORDS } from "@/lib/constants";
import { useLanguage } from "@/lib/language-context";

interface KeywordInputProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  variant?: "include" | "exclude";
  maxKeywords?: number;
}

export function KeywordInput({
  keywords,
  onChange,
  variant = "include",
  maxKeywords: maxKw,
}: KeywordInputProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const { t } = useLanguage();
  const limit = maxKw ?? MAX_KEYWORDS;

  const label = variant === "exclude" ? t.excludeKeywordsLabel : t.interestKeywordsLabel;
  const placeholder = variant === "exclude" ? t.excludeKeywordPlaceholder : t.keywordPlaceholder;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      const kw = input.trim();
      if (/\s/.test(kw)) {
        setError(t.keywordSingleWordOnly);
        return;
      }
      setError("");
      if (!keywords.includes(kw) && keywords.length < limit) {
        onChange([...keywords, kw]);
      }
      setInput("");
    } else {
      setError("");
    }
  }

  function remove(kw: string) {
    onChange(keywords.filter((k) => k !== kw));
  }

  const badgeVariant = variant === "exclude" ? "destructive" : "default";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs text-muted-foreground">{keywords.length}/{limit}</span>
      </div>
      <Input
        placeholder={placeholder}
        value={input}
        onChange={(e) => { setInput(e.target.value); setError(""); }}
        onKeyDown={handleKeyDown}
        disabled={keywords.length >= limit}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <Badge key={kw} variant={badgeVariant} className="gap-1 cursor-pointer" onClick={() => remove(kw)}>
              {kw}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
