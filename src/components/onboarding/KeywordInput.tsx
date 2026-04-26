"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
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

  function addKeyword() {
    const kw = input.trim();
    if (!kw) return;
    if (/\s/.test(kw)) {
      setError(t.keywordSingleWordOnly);
      return;
    }
    setError("");
    if (!keywords.includes(kw) && keywords.length < limit) {
      onChange([...keywords, kw]);
    }
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      addKeyword();
    } else {
      setError("");
    }
  }

  function remove(kw: string) {
    onChange(keywords.filter((k) => k !== kw));
  }

  const badgeVariant = variant === "exclude" ? "destructive" : "default";
  const disabled = keywords.length >= limit;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs text-muted-foreground">{keywords.length}/{limit}</span>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(""); }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          variant={variant === "exclude" ? "destructive" : "default"}
          onClick={addKeyword}
          disabled={disabled || !input.trim()}
          aria-label={t.adminAdd}
          title={t.adminAdd}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">{t.adminAdd}</span>
        </Button>
      </div>
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
