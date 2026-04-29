import { createAdminClient } from "@/lib/supabase/admin";
import { classifyArticlesAI } from "./classifier";
import { getProvider } from "./client";

export interface ClassifyRecentResult {
  considered: number;
  stage1Updated: number;
  stage2Updated: number;
  remaining: number;
  durationMs: number;
}

/**
 * 카테고리가 아직 NULL 인 최근 기사들을 LLM 으로 분류해 articles.category 를 채운다.
 * collector 의 인라인 AI 분류와 별개로, 백그라운드 cron / 어드민 버튼에서 호출.
 */
export async function classifyRecentUncategorized(opts?: {
  hours?: number;
  max?: number;
}): Promise<ClassifyRecentResult> {
  const t0 = Date.now();
  const supabase = createAdminClient();
  const hours = opts?.hours ?? 24;
  const max = opts?.max ?? 200;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data: rows } = await supabase
    .from("articles")
    .select("id, external_id, title, description")
    .is("category", null)
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false })
    .limit(max);

  const considered = rows?.length ?? 0;
  if (!rows || rows.length === 0) {
    return { considered: 0, stage1Updated: 0, stage2Updated: 0, remaining: 0, durationMs: Date.now() - t0 };
  }

  // external_id → DB row id 매핑
  const dbIdByExternal = new Map<string, string>();
  for (const r of rows as any[]) dbIdByExternal.set(r.external_id, r.id);

  async function applyResults(stage: 1 | 2, inputs: { id: string; title: string; description: string | null }[]): Promise<number> {
    if (inputs.length === 0) return 0;
    const result = await classifyArticlesAI(inputs, stage);
    const updates: { id: string; category: string }[] = [];
    result.forEach((cat, externalId) => {
      if (!cat) return;
      const dbId = dbIdByExternal.get(externalId);
      if (dbId) updates.push({ id: dbId, category: cat });
    });
    // 청크 병렬 update
    const CHUNK = 50;
    for (let i = 0; i < updates.length; i += CHUNK) {
      const slice = updates.slice(i, i + CHUNK);
      await Promise.all(
        slice.map((u) =>
          supabase.from("articles").update({ category: u.category }).eq("id", u.id)
        )
      );
    }
    return updates.length;
  }

  // Stage 1: 전체 미분류 대상
  const stage1Updated = await applyResults(
    1,
    (rows as any[]).map((r) => ({ id: r.external_id, title: r.title, description: r.description }))
  );

  // Stage 2: stage 1 으로도 미해결인 것만 (provider 다를 때만)
  let stage2Updated = 0;
  if (getProvider(1) !== getProvider(2)) {
    // 다시 NULL 인 행을 조회
    const { data: stillNull } = await supabase
      .from("articles")
      .select("id, external_id, title, description")
      .is("category", null)
      .gte("published_at", cutoff)
      .in("id", (rows as any[]).map((r) => r.id));
    stage2Updated = await applyResults(
      2,
      (stillNull ?? []).map((r: any) => ({ id: r.external_id, title: r.title, description: r.description }))
    );
  }

  const remaining = considered - stage1Updated - stage2Updated;
  return { considered, stage1Updated, stage2Updated, remaining, durationMs: Date.now() - t0 };
}
