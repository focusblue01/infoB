import Parser from "rss-parser";
import type { RawArticle } from "./types";

// 단일 소스 응답 지연이 전체 수집을 갉아먹는 것을 방지 (10s → 6s)
const parser = new Parser({
  timeout: 6000,
  headers: { "User-Agent": "DailyNewsDigest/1.0" },
});

export async function fetchRssFeed(
  feedUrl: string,
  sourceName: string
): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(feedUrl);

    return (feed.items ?? []).map((item) => ({
      externalId: item.guid || item.link || `${sourceName}-${item.title}`,
      sourceName: feed.title || sourceName,
      sourceUrl: item.link || null,
      title: item.title || "제목 없음",
      description: item.contentSnippet?.slice(0, 500) || item.content?.slice(0, 500) || null,
      content: item.content?.slice(0, 500) || null,
      imageUrl: item.enclosure?.url || null,
      author: item.creator || null,
      publishedAt: item.isoDate || item.pubDate || null,
      matchedKeywords: [],
    }));
  } catch (error) {
    console.error(`RSS fetch failed for ${feedUrl}:`, error);
    return [];
  }
}
