import { createAdminClient } from "@/lib/supabase/admin";
import { fetchByKeywords, fetchByCategory } from "./newsapi";
import { fetchRssFeed } from "./rss";
import { DEFAULT_RSS_SOURCES, type DefaultRssSource } from "./defaultSources";
import type { RawArticle } from "./types";
import type { NewsCategory } from "@/types";

// 제목 유사도 비교 (간단한 자카드 유사도)
function titleSimilarity(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/);
  const wordsB = b.toLowerCase().split(/\s+/);
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  const intersection = Array.from(setA).filter((x) => setB.has(x));
  const union = new Set(wordsA.concat(wordsB));
  return intersection.length / union.size;
}

// 주요 뉴스 클러스터링: 같은 사건 3건+ → is_major
function markMajorArticles(articles: RawArticle[]): Map<string, boolean> {
  const majorMap = new Map<string, boolean>();
  const checked = new Set<number>();

  for (let i = 0; i < articles.length; i++) {
    if (checked.has(i)) continue;
    const cluster = [i];

    for (let j = i + 1; j < articles.length; j++) {
      if (checked.has(j)) continue;
      if (titleSimilarity(articles[i].title, articles[j].title) > 0.4) {
        cluster.push(j);
        checked.add(j);
      }
    }

    const isMajor = cluster.length >= 3;
    for (const idx of cluster) {
      majorMap.set(articles[idx].externalId, isMajor);
    }
    checked.add(i);
  }

  return majorMap;
}

export async function collectNews(): Promise<{ collected: number; skipped: number }> {
  const supabase = createAdminClient();

  // 1. 활성 관심사 그룹 조회
  const { data: groups } = await supabase
    .from("interest_groups")
    .select("*")
    .eq("is_active", true);

  if (!groups?.length) return { collected: 0, skipped: 0 };

  // 2. 제외 키워드 조회 (전체 사용자)
  const { data: excludeKws } = await supabase
    .from("user_keywords")
    .select("keyword")
    .eq("is_exclude", true);
  const excludeSet = new Set((excludeKws ?? []).map((k: any) => k.keyword.toLowerCase()));

  // 3. RSS 소스 조회 (기본 소스 + 사용자 등록 소스 병합, URL 중복 제거)
  const { data: userSources } = await supabase
    .from("user_sources")
    .select("name, url")
    .eq("is_active", true);

  const userUrls = new Set((userSources ?? []).map((s: any) => s.url));
  const rssSources: DefaultRssSource[] = [
    ...DEFAULT_RSS_SOURCES.filter((s) => !userUrls.has(s.url)),
    ...(userSources ?? []).map((s: any) => ({ name: s.name, url: s.url })),
  ];

  const allArticles: RawArticle[] = [];
  const articleCategoryMap = new Map<string, NewsCategory>();
  const articleKeywordMap = new Map<string, Set<string>>();

  const categoryGroups = groups.filter((g: any) => g.group_type === "category");
  const keywordGroups = groups.filter((g: any) => g.group_type === "keyword");
  const allKeywords = keywordGroups.map((g: any) => g.group_key);

  // 모든 fetch를 병렬로 실행
  const kwBatchSize = 5;
  const keywordBatches: string[][] = [];
  for (let i = 0; i < allKeywords.length; i += kwBatchSize) {
    keywordBatches.push(allKeywords.slice(i, i + kwBatchSize));
  }

  const [categoryResults, keywordResults, rssResults] = await Promise.all([
    Promise.all(
      categoryGroups.map((g: any) =>
        fetchByCategory(g.group_key, { pageSize: 50 }).then((arts) => ({ group: g, arts }))
      )
    ),
    Promise.all(
      keywordBatches.map((batch) =>
        fetchByKeywords(batch, { pageSize: 50 }).then((arts) => ({ batch, arts }))
      )
    ),
    Promise.all((rssSources ?? []).map((s: any) => fetchRssFeed(s.url, s.name))),
  ]);

  // 카테고리 결과 취합
  for (const { group, arts } of categoryResults) {
    for (const a of arts) {
      allArticles.push(a);
      articleCategoryMap.set(a.externalId, group.group_key as NewsCategory);
    }
  }

  // 키워드 결과 취합
  for (const { batch, arts } of keywordResults) {
    for (const a of arts) {
      allArticles.push(a);
      if (!articleKeywordMap.has(a.externalId)) {
        articleKeywordMap.set(a.externalId, new Set());
      }
      const set = articleKeywordMap.get(a.externalId)!;
      for (const kw of a.matchedKeywords) set.add(kw);
      const text = `${a.title} ${a.description ?? ""}`.toLowerCase();
      for (const kw of batch) {
        if (text.includes(kw.toLowerCase())) set.add(kw);
      }
    }
  }

  // RSS 결과 취합 + 카테고리 매핑 + 키워드 매핑
  for (let i = 0; i < rssResults.length; i++) {
    const sourceCategory = rssSources[i]?.category as NewsCategory | undefined;
    for (const a of rssResults[i]) {
      allArticles.push(a);
      // 소스에 카테고리 정의된 경우 기사 카테고리 설정 (category 없는 기사만)
      if (sourceCategory && !articleCategoryMap.has(a.externalId)) {
        articleCategoryMap.set(a.externalId, sourceCategory);
      }
      const text = `${a.title} ${a.description ?? ""}`.toLowerCase();
      if (!articleKeywordMap.has(a.externalId)) {
        articleKeywordMap.set(a.externalId, new Set());
      }
      const kwSet = articleKeywordMap.get(a.externalId)!;
      for (const kw of allKeywords) {
        if (text.includes(kw.toLowerCase())) kwSet.add(kw);
      }
    }
  }

  // 6. 제외 필터 + 중복 제거 (externalId 기준)
  const seen = new Set<string>();
  const filtered = allArticles.filter((a) => {
    if (seen.has(a.externalId)) return false;
    seen.add(a.externalId);
    const text = `${a.title} ${a.description ?? ""}`.toLowerCase();
    return !Array.from(excludeSet).some((kw) => text.includes(kw));
  });

  // 7. 클러스터링
  const majorMap = markMajorArticles(filtered);

  // 8. 배치 upsert (한 번에 삽입)
  const rows = filtered.map((article) => ({
    external_id: article.externalId,
    source_name: article.sourceName,
    source_url: article.sourceUrl,
    title: article.title,
    description: article.description,
    content: article.content,
    image_url: article.imageUrl,
    author: article.author,
    category: articleCategoryMap.get(article.externalId) ?? null,
    matched_keywords: Array.from(articleKeywordMap.get(article.externalId) ?? new Set<string>()),
    is_major: majorMap.get(article.externalId) ?? false,
    published_at: article.publishedAt,
  }));

  let collected = 0;
  let skipped = 0;
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("articles")
      .upsert(chunk, { onConflict: "external_id", ignoreDuplicates: true })
      .select("id");
    if (error) {
      skipped += chunk.length;
    } else {
      const inserted = data?.length ?? 0;
      collected += inserted;
      skipped += chunk.length - inserted;
    }
  }

  return { collected, skipped };
}
