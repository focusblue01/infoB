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

  // 카테고리 → 한국어 검색 쿼리 매핑 (everything API로 한국 뉴스 수집)
  const queryMap: Record<string, string> = {
    technology: "IT OR 테크 OR 기술 OR 인공지능",
    economy: "경제 OR 금융 OR 주식 OR 증시",
    politics: "정치 OR 국회 OR 대통령",
    society: "사회 OR 사건 OR 이슈",
    culture: "문화 OR 영화 OR 음악",
    sports: "스포츠 OR 야구 OR 축구",
    science: "과학 OR 연구 OR 기술",
    global: "국제 OR 해외",
  };

  const params = new URLSearchParams({
    q: queryMap[category] ?? category,
    sortBy: "publishedAt",
    pageSize: String(options?.pageSize ?? 20),
    language: "ko",
    apiKey,
  });

  const res = await fetch(`${BASE_URL}/everything?${params}`);
  if (!res.ok) {
    const body = await res.text();
    console.error("NewsAPI category fetch error:", res.status, body);
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
    matchedKeywords: [],
  }));
}
