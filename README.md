# InfoB

AI 기반 개인화 뉴스 큐레이션 웹앱. 사용자가 설정한 관심사(카테고리/키워드)를 바탕으로 매일 뉴스를 수집하고, Claude API로 1,500자 내외의 한국어 분석 브리핑을 자동 생성합니다.

## 핵심 기능

- **관심사 기반 수집**: 카테고리(8종) + 키워드 + RSS 소스 + 제외 키워드
- **AI 브리핑**: Claude API로 핵심요약 / 상세분석 / 주목포인트 구조 생성
- **공유 요약 아키텍처**: `interest_groups` 기반 중복 제거로 10배 비용 절감 ($150 → $16/월, 100명 기준)
- **이메일 발송**: Resend 기반 아침 7시 브리핑
- **웹 피드**: 날짜별 피드, 북마크, 좋아요/싫어요, 연속 읽기 스트릭

## 기술 스택

| 영역 | 스택 |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| DB / Auth | Supabase (PostgreSQL + Auth) |
| Styling | Tailwind CSS + shadcn/ui |
| AI | Claude API (`@anthropic-ai/sdk`, prompt caching) |
| News | NewsAPI.org + RSS (`rss-parser`) |
| Email | Resend |
| Cron | cron-job.org → Vercel API Routes |
| Deploy | Vercel |

## 파이프라인

```
04:00 KST  [cron] /api/cron/collect     → NewsAPI + RSS 수집, 제외 필터, 클러스터링
05:00 KST  [cron] /api/cron/summarize   → Claude API 브리핑 생성 (interest_group별 공유)
07:00 KST  [cron] /api/cron/email       → Resend로 사용자별 이메일 발송
```

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 환경변수 입력 필요
npm run dev
```

### 필수 환경변수

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEWSAPI_ORG_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

### DB 초기화

Supabase SQL Editor에서 순서대로 실행:

1. `supabase/migrations/001_initial_schema.sql` — 테이블 스키마
2. `supabase/migrations/002_rls_policies.sql` — RLS 정책

## 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/              # login, signup, callback
│   ├── (app)/               # feed, bookmarks, settings
│   ├── onboarding/
│   └── api/
│       ├── interests, feed, summaries, bookmarks, feedback, settings, sources
│       └── cron/{collect, summarize, email}
├── components/
│   ├── ui/                  # shadcn/ui
│   ├── layout/              # Navbar
│   ├── feed/, summary/, onboarding/
│   └── common/              # ThemeToggle
├── lib/
│   ├── supabase/            # client, server, admin
│   ├── news/                # newsapi, rss, collector
│   ├── ai/                  # client, prompts, summarizer
│   └── email/               # client, sender
└── types/
```

## 주요 설계 결정

- **Shared Summary**: 같은 카테고리/키워드에 관심 있는 사용자들이 하나의 요약을 공유 — 토큰 비용 10x 절감
- **Exclude Keywords**: 관심 키워드와 별도로 블랙리스트 키워드를 운영해 노이즈 필터링
- **Title Similarity Clustering**: Jaccard 유사도 > 0.4, 3개 이상 기사가 같은 이슈를 다루면 `is_major` 플래그
- **Prompt Caching**: Claude API의 prompt caching으로 system prompt 비용 절감
- **External Cron**: Vercel Hobby 플랜의 크론 제약을 피해 cron-job.org로 Korean timezone 스케줄링

## 문서

- `Daily_News_Digest_PRD_v2.0.docx` — 제품 요구사항 명세
- `Daily_News_Digest_Development_Plan.docx` — 세부 개발 계획
- `Daily_News_Digest_Project_Management.docx` — 프로젝트 개요 및 관리 매뉴얼

## 라이선스

Private project.
