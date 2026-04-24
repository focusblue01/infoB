# InfoB

AI 기반 개인화 뉴스 큐레이션 웹앱. 사용자가 설정한 관심사(카테고리/키워드)를 바탕으로 매일 뉴스를 수집하고, Claude API로 1,500자 내외의 한국어 분석 브리핑을 자동 생성합니다.

## 핵심 기능

- **관심사 기반 수집**: 카테고리(8종) + 키워드 + RSS 소스 + 제외 키워드
- **AI 브리핑**: Claude API로 핵심요약 / 상세분석 / 주목포인트 구조 생성
- **공유 요약 아키텍처**: `interest_groups` 기반 중복 제거로 10배 비용 절감 ($150 → $16/월, 100명 기준)
- **이메일 발송**: Resend 기반 아침 7시 브리핑
- **웹 피드**: 날짜별 피드, 북마크, 좋아요/싫어요, 연속 읽기 스트릭
- **플랜별 권한**: Free / Paid-Basic / Paid-Special / Admin / Tester 5개 역할과 기능 차등
- **다국어(KO/EN)**: 전체 UI 한/영 전환, 브리핑 본문 Claude 온디맨드 번역 및 DB 캐시
- **접근성 설정**: 설정 페이지에서 글자 크기 슬라이더(50~150%) 조절, localStorage 저장
- **테마 7종**: Light(전구) / Dark / Cloudy Night(Dark Gray) / Gloomy(Pastel Gray) / Rainy(Glassy Blue) / Leaf(Vibrant Green) / Sunny(Warm Yellow) — 드롭다운 콤보로 선택, next-themes + HSL 커스텀 프로퍼티 기반
- **관리자 페이지**: 사용자/카테고리/RSS/키워드 관리, 유사 키워드 직접 통합

## 권한/플랜

| 역할 | 코드 | 카테고리 | 키워드 | RSS | 북마크 | 이메일 알림 | 날짜 네비 | 수동 생성 |
|---|---|---|---|---|---|---|---|---|
| Free | `N` | 최대 3 | 0 | ✕ | ✕ | ✕ | ✕ | ✕ |
| Paid-Basic | `R` | 최대 5 | 최대 3 | ✕ | ✓ | ✕ | ✓ | 1일 1회 |
| Paid-Special | `S` | 무제한 | 최대 5 | ✓ | ✓ | ✓ | ✓ | 무제한 |
| Admin | `A` | 무제한 | 최대 5 | ✓ | ✓ | ✓ | ✓ | 무제한 + 관리자 페이지 |
| Tester | `T` | 무제한 | 최대 5 | ✓ | ✓ | ✓ | ✓ | 무제한 |

- 키워드는 권한과 무관하게 공백 없는 단일 단어만 허용
- 서버(API) / 클라이언트(UI) 양쪽에서 동시 검증

## 기술 스택

| 영역 | 스택 |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| DB / Auth | Supabase (PostgreSQL + Auth) |
| Styling | Tailwind CSS + shadcn/ui |
| AI | Claude API (`@anthropic-ai/sdk`, prompt caching, 온디맨드 번역) |
| News | NewsAPI.org + RSS (`rss-parser`) |
| Email | Resend |
| Cron | cron-job.org → Vercel API Routes |
| State | React Context (Language / UserRole / FontSize), localStorage |
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
│   ├── layout/              # Navbar, ClientWrapper
│   ├── feed/, summary/, onboarding/, admin/, landing/
│   └── common/              # ThemeToggle
├── lib/
│   ├── supabase/            # client, server, admin
│   ├── news/                # newsapi, rss, collector
│   ├── ai/                  # client, prompts, summarizer, translator
│   ├── email/               # client, sender
│   ├── permissions.ts       # 역할별 기능 게이팅
│   ├── language-context.tsx # KO/EN 번역 사전 + Provider
│   ├── user-context.tsx     # UserRole Provider
│   └── font-size-context.tsx# 글자 크기(50~150%) Provider
└── types/
```

## 주요 설계 결정

- **Shared Summary**: 같은 카테고리/키워드에 관심 있는 사용자들이 하나의 요약을 공유 — 토큰 비용 10x 절감
- **Exclude Keywords**: 관심 키워드와 별도로 블랙리스트 키워드를 운영해 노이즈 필터링
- **Title Similarity Clustering**: Jaccard 유사도 > 0.4, 3개 이상 기사가 같은 이슈를 다루면 `is_major` 플래그
- **Prompt Caching**: Claude API의 prompt caching으로 system prompt 비용 절감
- **External Cron**: Vercel Hobby 플랜의 크론 제약을 피해 cron-job.org로 Korean timezone 스케줄링
- **On-demand 번역**: 한국어 원문만 Claude로 생성·저장하고, EN 전환 시 번역 결과를 `title_en`/`content_en` 컬럼에 캐시해 재요청을 방지
- **Server + Client 권한 이중 검증**: `permissions.ts` 규칙을 UI와 API 양쪽에서 공유, N은 생성 차단, R은 하루 1회(`last_generated_date`) 제한
- **글자 크기 적용 범위**: FontSizeProvider 를 루트 레이아웃에 두어 랜딩까지 반영, 모바일 상단 네비는 `.nav-scale-lock` 으로 고정 px 로 override 해 UX 안정성 유지
- **테마 시스템**: `globals.css` 에 테마별 HSL 토큰 세트를 정의하고 next-themes `themes` 배열에 등록, `ThemeToggle` 은 드롭다운 리스트(현재 선택 체크 표시, 바깥 클릭/ESC 로 닫힘)로 구현
- **브리핑 참조 정렬**: 조회일 기준 전일 KST 00:00 이후 기사로 엄격 제한, 정렬 우선순위는 (1) 발행일(KST) desc (2) is_major desc (3) 연합뉴스 계열 소스 (4) timestamp — 최신 날짜 기사가 우선 참조되도록 보정

## 문서

- `Daily_News_Digest_PRD_v2.0.docx` — 제품 요구사항 명세
- `Daily_News_Digest_Development_Plan.docx` — 세부 개발 계획
- `Daily_News_Digest_Project_Management.docx` — 프로젝트 개요 및 관리 매뉴얼

## 라이선스

Private project.
