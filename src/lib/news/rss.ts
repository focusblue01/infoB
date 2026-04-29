import Parser from "rss-parser";
import type { RawArticle } from "./types";

// Node 18+ 의 글로벌 fetch (undici 기반) 가 자동으로 keep-alive 연결을 유지.
// rss-parser 의 parseURL 대신 직접 fetch 후 parseString 으로 처리해
// timeout/keep-alive/에러 메시지 제어를 명확히 한다.
const RSS_TIMEOUT_MS = 6000;
const USER_AGENT = "DailyNewsDigest/1.0";

const parser = new Parser({
  // parseString 에서는 timeout 옵션이 동작하지 않으므로 fetch 측에서 처리
  headers: { "User-Agent": USER_AGENT },
});

export interface RssFetchHealth {
  ok: boolean;
  itemCount: number;
  responseMs: number;
  error: string | null;
}

export interface RssFetchResult {
  articles: RawArticle[];
  health: RssFetchHealth;
}

export async function fetchRssFeed(
  feedUrl: string,
  sourceName: string
): Promise<RssFetchResult> {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RSS_TIMEOUT_MS);

  try {
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    const feed = await parser.parseString(text);

    const articles: RawArticle[] = (feed.items ?? []).map((item) => ({
      externalId: item.guid || item.link || `${sourceName}-${item.title}`,
      // 피드 자체의 channel.title 이 등록한 이름과 다르게 나오는 경우(예: Reddit
      // RSS 의 "popular links", HNRSS 의 "Front Page") trending source 필터 등이
      // 깨지므로 항상 우리가 등록한 이름(rss_sources.name) 으로 통일.
      sourceName,
      sourceUrl: item.link || null,
      title: item.title || "제목 없음",
      description:
        item.contentSnippet?.slice(0, 500) || item.content?.slice(0, 500) || null,
      content: item.content?.slice(0, 500) || null,
      imageUrl: item.enclosure?.url || null,
      author: item.creator || null,
      publishedAt: item.isoDate || item.pubDate || null,
      matchedKeywords: [],
    }));

    return {
      articles,
      health: {
        ok: true,
        itemCount: articles.length,
        responseMs: Date.now() - t0,
        error: null,
      },
    };
  } catch (error: any) {
    const isAbort = error?.name === "AbortError";
    const msg = isAbort ? `timeout ${RSS_TIMEOUT_MS}ms` : (error?.message ?? "unknown error");
    console.error(`RSS fetch failed for ${feedUrl}:`, msg);
    return {
      articles: [],
      health: {
        ok: false,
        itemCount: 0,
        responseMs: Date.now() - t0,
        error: msg,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
