import { createAdminClient } from "@/lib/supabase/admin";
import { fetchByKeywords, fetchByCategory } from "./newsapi";
import { fetchRssFeed } from "./rss";
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

  // 3. RSS 소스 조회
  const { data: rssSources } = await supabase
    .from("user_sources")
    .select("name, url")
    .eq("is_active", true);

  const allArticles: RawArticle[] = [];
  const categoryGroups = groups.filter((g: any) => g.group_type === "category");
  const keywordGroups = groups.filter((g: any) => g.group_type === "keyword");

  // 4a. 카테고리별 NewsAPI 수집
  for (const group of categoryGroups) {
    const articles = await fetchByCategory(group.group_key, { pageSize: 20 });
    allArticles.push(...articles);
  }

  // 4b. 키워드 배치 NewsAPI 수집 (OR 쿼리로 배치)
  const kwBatchSize = 5;
  const allKeywords = keywordGroups.map((g: any) => g.group_key);
  for (let i = 0; i < allKeywords.length; i += kwBatchSize) {
    const batch = allKeywords.slice(i, i + kwBatchSize);
    const articles = await fetchByKeywords(batch, { pageSize: 20 });
    allArticles.push(...articles);
  }

  // 5. RSS 수집
  for (const source of rssSources ?? []) {
    const articles = await fetchRssFeed(source.url, source.name);
    allArticles.push(...articles);
  }

  // 6. 제외 필터
  const filtered = allArticles.filter((a) => {
    const text = `${a.title} ${a.description ?? ""}`.toLowerCase();
    return !Array.from(excludeSet).some((kw) => text.includes(kw));
  });

  // 7. 클러스터링
  const majorMap = markMajorArticles(filtered);

  // 8. DB 삽입 (중복 무시)
  let collected = 0;
  let skipped = 0;

  // 키워드 매칭 보강
  const allKws = keywordGroups.map((g: any) => g.group_key);

  for (const article of filtered) {
    // 키워드 매칭
    const matched = allKws.filter(
      (kw: string) =>
        article.title.toLowerCase().includes(kw.toLowerCase()) ||
        (article.description ?? "").toLowerCase().includes(kw.toLowerCase())
    );

    // 카테고리 추론 (간단 매칭)
    let category: NewsCategory | null = null;
    for (const cg of categoryGroups) {
      if (article.matchedKeywords.length === 0 && allArticles.indexOf(article) !== -1) {
        category = cg.group_key as NewsCategory;
        break;
      }
    }

    const { error } = await supabase.from("articles").insert({
      external_id: article.externalId,
      source_name: article.sourceName,
      source_url: article.sourceUrl,
      title: article.title,
      description: article.description,
      content: article.content,
      image_url: article.imageUrl,
      author: article.author,
      category,
      matched_keywords: Array.from(new Set([...article.matchedKeywords, ...matched])),
      is_major: majorMap.get(article.externalId) ?? false,
      published_at: article.publishedAt,
    });

    if (error?.code === "23505") {
      skipped++;
    } else if (!error) {
      collected++;
    }
  }

  return { collected, skipped };
}
