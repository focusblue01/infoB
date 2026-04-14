"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { MAX_KEYWORDS } from "@/lib/constants";

interface KeywordInputProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  label?: string;
  placeholder?: string;
  variant?: "include" | "exclude";
}

export function KeywordInput({
  keywords,
  onChange,
  label = "관심 키워드",
  placeholder = "키워드 입력 후 Enter",
  variant = "include",
}: KeywordInputProps) {
  const [input, setInput] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      const kw = input.trim();
      if (!keywords.includes(kw) && keywords.length < MAX_KEYWORDS) {
        onChange([...keywords, kw]);
      }
      setInput("");
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
        <span className="text-xs text-muted-foreground">{keywords.length}/{MAX_KEYWORDS}</span>
      </div>
      <Input
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={keywords.length >= MAX_KEYWORDS}
      />
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
