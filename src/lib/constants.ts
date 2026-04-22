import type { NewsCategory } from "@/types";

export const CATEGORIES: { value: NewsCategory; label: string; emoji: string }[] = [
  { value: "technology", label: "IT/기술", emoji: "💻" },
  { value: "economy", label: "경제/금융", emoji: "📈" },
  { value: "politics", label: "정치", emoji: "🏛️" },
  { value: "society", label: "사회", emoji: "🏘️" },
  { value: "culture", label: "문화", emoji: "🎭" },
  { value: "sports", label: "스포츠", emoji: "⚽" },
  { value: "science", label: "과학", emoji: "🔬" },
  { value: "global", label: "글로벌", emoji: "🌍" },
];

export const MAX_KEYWORDS = 10;
export const MAX_CATEGORIES = 4;
