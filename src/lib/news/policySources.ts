/**
 * 글로벌 정부 정책 시스템 브리핑(global-policy) 입력 소스 화이트리스트.
 * 일반 뉴스/커뮤니티는 제외 — 정부·국제기구 공식 발표만 모아 정책 브리핑을 구성.
 *
 * RSS 자체는 rss_sources 에 priority=30, category=NULL 로 등록되어 일반 카테고리
 * 분류 흐름과 분리된다. summarizer 가 group_key='global-policy' 일 때 이 리스트로
 * `articles.source_name IN (...)` 필터를 사용한다.
 */
export const GLOBAL_POLICY_SOURCE_NAMES: ReadonlyArray<string> = [
  // 북미
  "US Federal Register",
  "US Federal Register Significant",
  "Canada.ca News",      // 비활성 (alt 미확보) — row 보존
  "PM Canada",           // 캐나다 갭 보강
  // 유럽
  "UK GOV.UK Announcements",
  "Bundesregierung EN",  // 비활성 (alt 미확보)
  "EU Commission Press",
  "European Parliament Press",
  // 동아시아
  "Japan Kantei",        // 비활성 (alt 미확보)
  "Japan Times Top",     // 일본 갭 보강 (신문사 — 일본 정책 보도 커버)
  "대한민국 정책브리핑",      // 비활성 (alt 미확보)
  "KOREA.net Press",     // 비활성 (alt 미확보)
  // 남아시아
  "India PIB Press Releases",
  // 국제기구
  "IMF News",            // 비활성 (alt 미확보)
];
