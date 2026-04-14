import type { RawArticle } from "./types";
import crypto from "crypto";

const BASE_URL = "https://newsapi.org/v2";

interface NewsAPIArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

function generateExternalId(article: NewsAPIArticle): string {
  const raw = `${article.source.name}|${article.title}|${article.publishedAt}`;
  return crypto.createHash("md5").update(raw).digest("hex");
}

function truncateContent(content: string | null, maxLength = 500): string | null {
  if (!content) return null;
  // NewsAPI content often has "[+N chars]" suffix
  const cleaned = content.replace(/\[\+\d+ chars\]$/, "").trim();
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

export async function fetchByKeywords(
  keywords: string[],
  options?: { pageSize?: number; from?: string; to?: string }
): Promise<RawArticle[]> {
  const apiKey = process.env.NEWSAPI_ORG_KEY;
  if (!apiKey) throw new Error("NEWSAPI_ORG_KEY is not set");

  const query = keywords.join(" OR ");
  const params = new URLSearchParams({
    q: query,
    sortBy: "relevancy",
    pageSize: String(options?.pageSize ?? 20),
    language: "ko",
    apiKey,
  });

  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);

  const res = await fetch(`${BASE_URL}/everything?${params}`);
  if (!res.ok) {
    const body = await res.text();
    console.error("NewsAPI error:", res.status, body);
    return [];
  }

  const data = await res.json();
  const articles: NewsAPIArticle[] = data.articles ?? [];

  return articles.map((a) => ({
    externalId: generateExternalId(a),
    sourceName: a.source.name,
    sourceUrl: a.url,
    title: a.title,
    description: a.description,
    content: truncateContent(a.content),
    imageUrl: a.urlToImage,
    author: a.author,
    publishedAt: a.publishedAt,
    matchedKeywords: keywords.filter(
      (kw) =>
        a.title?.toLowerCase().includes(kw.toLowerCase()) ||
        a.description?.toLowerCase().includes(kw.toLowerCase())
    ),
  }));
}

export async function fetchByCategory(
  category: string,
  options?: { pageSize?: number; country?: string }
): Promise<RawArticle[]> {
  const apiKey = process.env.NEWSAPI_ORG_KEY;
  if (!apiKey) throw new Error("NEWSAPI_ORG_KEY is not set");

  // NewsAPI category mapping
  const categoryMap: Record<string, string> = {
    technology: "technology",
    economy: "business",
    politics: "general",
    society: "general",
    culture: "entertainment",
    sports: "sports",
    science: "science",
    global: "general",
  };

  const params = new URLSearchParams({
    category: categoryMap[category] ?? "general",
    country: options?.country ?? "kr",
    pageSize: String(options?.pageSize ?? 20),
    apiKey,
  });

  const res = await fetch(`${BASE_URL}/top-headlines?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  const articles: NewsAPIArticle[] = data.articles ?? [];

  return articles.map((a) => ({
    externalId: generateExternalId(a),
    sourceName: a.source.name,
    sourceUrl: a.url,
    title: a.title,
    description: a.description,
    content: truncateContent(a.content),
    imageUrl: a.urlToImage,
    author: a.author,
    publishedAt: a.publishedAt,
    matchedKeywords: [],
  }));
}
