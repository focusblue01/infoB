export type NewsCategory =
  | "technology"
  | "economy"
  | "politics"
  | "society"
  | "culture"
  | "sports"
  | "science"
  | "global";

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  technology: "IT/기술",
  economy: "경제/금융",
  politics: "정치",
  society: "사회",
  culture: "문화",
  sports: "스포츠",
  science: "과학",
  global: "글로벌",
};

export const CATEGORY_COLORS: Record<NewsCategory, string> = {
  technology: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  economy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  politics: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  society: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  culture: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  sports: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  science: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  global: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
};

export interface Profile {
  id: string;
  display_name: string | null;
  notification_enabled: boolean;
  notification_time: string;
  timezone: string;
  onboarding_completed: boolean;
  streak_count: number;
  last_read_date: string | null;
}

export interface UserKeyword {
  id: string;
  user_id: string;
  keyword: string;
  is_exclude: boolean;
}

export interface UserSource {
  id: string;
  user_id: string;
  name: string;
  url: string;
  is_active: boolean;
}

export interface Article {
  id: string;
  external_id: string;
  source_name: string;
  source_url: string | null;
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  category: NewsCategory | null;
  matched_keywords: string[];
  is_major: boolean;
  published_at: string;
  collected_at: string;
}

export interface Summary {
  id: string;
  interest_group_id: string | null;
  title: string;
  content: string;
  category: NewsCategory | null;
  keywords: string[];
  article_ids: string[];
  briefing_date: string;
  prompt_version: string;
  model_used: string | null;
  token_count: number | null;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  summary_id: string;
  created_at: string;
}

export interface Feedback {
  id: string;
  user_id: string;
  summary_id: string;
  is_positive: boolean;
  created_at: string;
}

export interface InterestGroup {
  id: string;
  group_type: "category" | "keyword";
  group_key: string;
  similar_keywords: string[];
  subscriber_count: number;
  is_active: boolean;
}
