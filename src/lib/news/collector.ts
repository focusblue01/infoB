import { createAdminClient } from "@/lib/supabase/admin";
import { fetchByKeywords, fetchByCategory } from "./newsapi";
import { fetchRssFeed } from "./rss";
import type { DefaultRssSource } from "./defaultSources";
import type { RawArticle } from "./types";
import type { NewsCategory } from "@/types";
import {
  inferCategory,
  scoreCategories,
  keywordMatches,
  CLASSIFICATION_THRESHOLDS,
} from "./categoryKeywords";
import { classifyArticlesAI } from "@/lib/ai/classifier";
import { getProvider } from "@/lib/ai/client";

// 제한된 동시성으로 비동기 작업 처리 (느린 소스 한 곳이 전체 진행을
// 묶는 현상을 방지하고 소켓 풀 안정화)
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(limit, 1), items.length) },
    async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) break;
        results[i] = await fn(items[i], i);
      }
    }
  );
  await Promise.all(workers);
  return results;
}

// 제목 유사도 비교 (자카드)
function titleSimilarity(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/);
  const wordsB = b.toLowerCase().split(/\s+/);
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  const intersection = Array.from(setA).filter((x) => setB.has(x));
  const union = new Set(wordsA.concat(wordsB));
  return intersection.length / union.size;
}

// 주요 뉴스 클러스터링 (A-4 + A-5)
//   - 클러스터링 입력을 최근 24h 발행분으로 한정 (오래된 기사는 어차피
//     브리핑에 안 쓰임)
//   - 단어 인덱스 기반 candidate pair 만 Jaccard 검사 → O(N²) 회피.
//     너무 generic 한 토큰 버킷(>30) 은 skip.
//   - 연결 컴포넌트(union-find 대신 BFS) 로 클러스터 사이즈 계산
function markMajorArticles(articles: RawArticle[]): Map<string, boolean> {
  const majorMap = new Map<string, boolean>();
  const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;

  // 24h 이내 후보만 추림
  const cand: number[] = [];
  for (let i = 0; i < articles.length; i++) {
    const ts = articles[i].publishedAt
      ? new Date(articles[i].publishedAt as string).getTime()
      : NaN;
    if (Number.isFinite(ts) && ts >= cutoffMs) cand.push(i);
  }
  if (cand.length === 0) return majorMap;

  // 단어 → 후보 인덱스 매핑 (각 기사 제목의 의미 있는 토큰만)
  const wordIdx = new Map<string, number[]>();
  for (const i of cand) {
    const words = Array.from(
      new Set(
        articles[i].title
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length >= 2)
      )
    ).slice(0, 6); // 첫 6 토큰만 인덱싱
    for (const w of words) {
      let bucket = wordIdx.get(w);
      if (!bucket) {
        bucket = [];
        wordIdx.set(w, bucket);
      }
      bucket.push(i);
    }
  }

  // 같은 토큰을 공유하는 쌍만 후보로 (generic 단어 버킷은 skip)
  const pairs = new Set<string>();
  wordIdx.forEach((idxs) => {
    if (idxs.length < 2 || idxs.length > 30) return;
    for (let i = 0; i < idxs.length; i++) {
      for (let j = i + 1; j < idxs.length; j++) {
        const a = idxs[i] < idxs[j] ? idxs[i] : idxs[j];
        const b = idxs[i] < idxs[j] ? idxs[j] : idxs[i];
        pairs.add(`${a}|${b}`);
      }
    }
  });

  // 인접 그래프
  const adj = new Map<number, Set<number>>();
  pairs.forEach((p) => {
    const sep = p.indexOf("|");
    const a = Number(p.slice(0, sep));
    const b = Number(p.slice(sep + 1));
    if (titleSimilarity(articles[a].title, articles[b].title) > 0.4) {
      let sa = adj.get(a);
      if (!sa) {
        sa = new Set();
        adj.set(a, sa);
      }
      sa.add(b);
      let sb = adj.get(b);
      if (!sb) {
        sb = new Set();
        adj.set(b, sb);
      }
      sb.add(a);
    }
  });

  // BFS 로 연결 컴포넌트 → 클러스터 사이즈 계산
  const visited = new Set<number>();
  for (const start of cand) {
    if (visited.has(start)) continue;
    const stack = [start];
    const cluster: number[] = [];
    while (stack.length) {
      const v = stack.pop() as number;
      if (visited.has(v)) continue;
      visited.add(v);
      cluster.push(v);
      const neighbors = adj.get(v);
      if (neighbors) neighbors.forEach((n) => { if (!visited.has(n)) stack.push(n); });
    }
    const isMajor = cluster.length >= 3;
    for (const idx of cluster) majorMap.set(articles[idx].externalId, isMajor);
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

  // 3. RSS 소스 조회 (admin rss_sources + 사용자 등록 소스 병합, URL 중복 제거)
  const [{ data: adminSources }, { data: userSources }] = await Promise.all([
    supabase.from("rss_sources").select("name, url, category, priority").eq("is_active", true),
    supabase.from("user_sources").select("name, url").eq("is_active", true),
  ]);

  const userUrls = new Set((userSources ?? []).map((s: any) => s.url));
  const rssSources: DefaultRssSource[] = [
    ...(adminSources ?? []).filter((s: any) => !userUrls.has(s.url)).map((s: any) => ({
      name: s.name, url: s.url, category: s.category ?? undefined, priority: s.priority ?? 10,
    })),
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
    // RSS 는 최대 20 동시 (소켓/도메인 풀 보호 + 느린 소스 격리)
    mapWithConcurrency(rssSources ?? [], 20, (s: any) => fetchRssFeed(s.url, s.name)),
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
      const text = `${a.title} ${a.description ?? ""}`;
      for (const kw of batch) {
        if (keywordMatches(text, kw)) set.add(kw);
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
      const text = `${a.title} ${a.description ?? ""}`;
      if (!articleKeywordMap.has(a.externalId)) {
        articleKeywordMap.set(a.externalId, new Set());
      }
      const kwSet = articleKeywordMap.get(a.externalId)!;
      for (const kw of allKeywords) {
        if (keywordMatches(text, kw)) kwSet.add(kw);
      }
    }
  }

  // ── 카테고리 정밀화 (3단 파이프라인) ──────────────────────────────
  // 1) 규칙 기반 inferCategory (점수+마진, 무비용)
  //    - 미지정 기사: 점수 통과 시 보충
  //    - 지정된 기사: 잘못 라벨된 경우 강한 override
  // 2) Stage 1 AI: 1단계로도 미지정 기사를 빠른 LLM 배치 분류 (AI_PROVIDER_1)
  // 3) Stage 2 AI: 1·2 단계로도 미지정인 기사를 더 정확한 모델로 재시도 (AI_PROVIDER_2)
  for (const a of allArticles) {
    const text = `${a.title} ${a.description ?? ""}`;
    const current = articleCategoryMap.get(a.externalId);
    if (!current) {
      const inferred = inferCategory(text);
      if (inferred) articleCategoryMap.set(a.externalId, inferred);
      continue;
    }
    const scores = scoreCategories(text);
    const ranked = (Object.entries(scores) as Array<[NewsCategory, number]>)
      .filter(([, s]) => s > 0)
      .sort((x, y) => y[1] - x[1]);
    if (ranked.length === 0) continue;
    const [topCat, topScore] = ranked[0];
    if (
      topCat !== current &&
      topScore >= CLASSIFICATION_THRESHOLDS.STRONG_OVERRIDE_SCORE &&
      (scores[current] ?? 0) === 0
    ) {
      articleCategoryMap.set(a.externalId, topCat);
    }
  }

  // AI 보조 분류 (A-1: 비용/시간 캡)
  //   - 카테고리 미지정 기사 중에서
  //   - 최근 24h 발행분만, 발행일 desc 정렬, 상위 200건으로 한정.
  //   - 24h 밖이거나 200건을 넘는 미지정 기사는 카테고리 NULL 로 두며,
  //     어차피 브리핑은 24h 이내 카테고리 매칭만 사용하므로 영향 없음.
  const AI_CLASSIFY_HOURS = 24;
  const AI_CLASSIFY_MAX = 200;
  const aiCutoffMs = Date.now() - AI_CLASSIFY_HOURS * 60 * 60 * 1000;
  const uncategorizedSeen = new Set<string>();
  const uncategorizedArticles = allArticles
    .filter((a) => {
      if (articleCategoryMap.has(a.externalId)) return false;
      if (uncategorizedSeen.has(a.externalId)) return false;
      uncategorizedSeen.add(a.externalId);
      const ts = a.publishedAt ? new Date(a.publishedAt).getTime() : NaN;
      return Number.isFinite(ts) && ts >= aiCutoffMs;
    })
    .sort((a, b) => {
      const ta = new Date(a.publishedAt as string).getTime();
      const tb = new Date(b.publishedAt as string).getTime();
      return tb - ta;
    })
    .slice(0, AI_CLASSIFY_MAX);

  if (uncategorizedArticles.length > 0) {
    const inputs = uncategorizedArticles.map((a) => ({
      id: a.externalId,
      title: a.title,
      description: a.description,
    }));

    // Stage 1: AI_PROVIDER_1 — fast bulk classification
    try {
      const stage1 = await classifyArticlesAI(inputs, 1);
      stage1.forEach((cat, id) => {
        if (cat) articleCategoryMap.set(id, cat);
      });
    } catch (e: any) {
      console.error("AI classify stage 1 failed:", e?.message);
    }

    // Stage 2: AI_PROVIDER_2 — refine remaining unknowns (provider 가 다를 때만)
    if (getProvider(1) !== getProvider(2)) {
      const stillUnknown = uncategorizedArticles
        .filter((a) => !articleCategoryMap.has(a.externalId))
        .map((a) => ({ id: a.externalId, title: a.title, description: a.description }));
      if (stillUnknown.length > 0) {
        try {
          const stage2 = await classifyArticlesAI(stillUnknown, 2);
          stage2.forEach((cat, id) => {
            if (cat) articleCategoryMap.set(id, cat);
          });
        } catch (e: any) {
          console.error("AI classify stage 2 failed:", e?.message);
        }
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
