# Source Analysis - 2026-05-02

## Scope

- Repository: `focusblue01/infoB`
- Runtime target: Vercel + Supabase
- Local setup: not performed
- Local service execution: not performed
- Checks performed:
  - `npx.cmd tsc --noEmit`
  - `npx.cmd next lint`
  - `npx.cmd next build`

## Application Overview

InfoB is a Next.js 14 App Router application for personalized daily news briefings.

Main runtime dependencies:

- Supabase Auth/Postgres through `@supabase/ssr` and `@supabase/supabase-js`
- AI providers: Anthropic, Gemini, OpenAI
- Email: Resend
- News ingestion: NewsAPI.org and RSS
- Deployment: Vercel
- External cron caller expected for `/api/cron/*` endpoints

Key directories:

- `src/app`: routes, pages, API handlers
- `src/lib/supabase`: browser/server/admin Supabase clients
- `src/lib/news`: RSS and NewsAPI collection
- `src/lib/ai`: provider selection, classification, summarization, translation
- `src/lib/email`: Resend email sender
- `supabase/migrations`: schema and RLS scripts

## Verification Results

`npx.cmd tsc --noEmit`

- Passed.

`npx.cmd next lint`

- Passed with warnings.
- Warnings are limited to missing React hook dependencies in:
  - `src/app/(app)/feed/page.tsx`
  - `src/app/(app)/feed/[id]/page.tsx`

`npx.cmd next build`

- Passed after rerunning outside the sandbox because the first sandboxed build failed with `spawn EPERM`.
- Build output generated 36 routes successfully.

## App Connection Status

GitHub:

- GitHub app read access is connected.
- Confirmed by reading `focusblue01/infoB` `package.json` from `main`.
- GitHub app write access is not available in this session. Branch creation through the GitHub app failed with `403 Resource not accessible by integration`.

Vercel:

- Vercel app tool is available.
- No teams were returned by the connected Vercel account.
- `.vercel/project.json` is not present in the repository, so the current Vercel project cannot be auto-identified from local files.
- Listing projects without a team ID failed.
- To complete Vercel project linking, provide either `.vercel/project.json` or the Vercel project ID/org ID pair.

Supabase:

- No Supabase app tool is available in this session.
- Supabase integration was analyzed from source, migrations, and env contracts only.
- Runtime requires:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Important Findings

### 1. Repository migrations do not fully reproduce the runtime schema

The source uses database fields and tables that are not present in the checked migration set:

- `profiles.role`
- `profiles.last_generated_date`
- `interest_groups.is_system`
- `rss_sources`
- `rss_sources.priority`
- `rss_sources.last_fetched_at`
- `rss_sources.last_success_at`
- `rss_sources.last_response_ms`
- `rss_sources.last_item_count`
- `rss_sources.last_error`
- `rss_sources.consecutive_failures`

Impact:

- A fresh Supabase project created only from `001_initial_schema.sql`, `002_rls_policies.sql`, and `003_add_english_content.sql` will not support the current app.
- Admin RSS management, role-gated features, system groups, feed system summaries, and on-demand generation can fail unless the live Supabase database has extra manual schema changes.

Recommended follow-up:

- Add a migration that captures the live production schema delta.
- Include seed/upsert data for default RSS sources and system interest groups if production depends on them.

### 2. `/api/debug` exposes broad service-role data to any authenticated user

`src/app/api/debug/route.ts` authenticates a user, then uses the Supabase service-role client to return broad application state such as all interest groups, recent summaries, and article counts.

Impact:

- Any logged-in user can access operational/debug data.
- This is risky in production even if secrets are not directly returned.

Recommended follow-up:

- Restrict this route to admins through `requireAdmin()`, or disable it in production.

### 3. Cron endpoint contract is clear but must be configured outside Vercel

The cron endpoints require:

- POST method
- `Authorization: Bearer <CRON_SECRET>`

Endpoints:

- `/api/cron/collect`
- `/api/cron/classify`
- `/api/cron/summarize`
- `/api/cron/email`

Recommended schedule from project docs:

- 04:00 KST collect
- 05:00 KST summarize
- 07:00 KST email
- classify should run after collect if AI classification is enabled

### 4. Image remote pattern is intentionally broad

`next.config.mjs` allows `https://**` for optimized images.

Impact:

- This is convenient for news images from arbitrary publishers.
- It is broader than ideal for a hardened production app.

Recommended follow-up:

- Keep as-is if arbitrary news image hosts are required.
- Otherwise, restrict to known source domains once RSS/source coverage stabilizes.

### 5. Local repo has unrelated dirty files

Before this analysis branch, the local worktree already had:

- modified `package-lock.json`
- untracked `.eslintrc.json`

These were not included in this analysis change.

## Environment Contract

Required production env vars based on source:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEWSAPI_ORG_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`

Provider-specific AI env vars:

- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `AI_PROVIDER_1`
- `AI_PROVIDER_2`
- `AI_PROVIDER`
- `OPENAI_MODEL`

Email:

- `RESEND_API_KEY`

## Recommended Next PRs

1. Add missing Supabase migration for runtime schema parity.
2. Restrict or remove `/api/debug` in production.
3. Add documented Vercel project linking metadata or deployment handoff notes.
4. Fix React hook dependency lint warnings.
5. Decide whether broad external image optimization is acceptable for production.
