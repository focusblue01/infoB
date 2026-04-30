/**
 * 트렌드/가쉽 브리핑(시스템 그룹) 의 입력 소스로 사용할 source_name 화이트리스트.
 * 일반 뉴스 아웃렛(연합뉴스/조선/한겨레 등)은 의도적으로 제외한다 — 트렌드 섹션은
 * 커뮤니티 시그널만으로 구성한다.
 *
 * RSS 자체는 rss_sources 테이블에 priority=20, category=NULL 로 등록되어 일반
 * 카테고리 분류 흐름과 분리된다. summarizer 가 group_key='trending' 일 때 이 리스트로
 * `articles.source_name IN (...)` 필터를 사용한다.
 */
export const TRENDING_SOURCE_NAMES: ReadonlyArray<string> = [
  // 해외 커뮤니티
  "Hacker News",
  "HNRSS Frontpage",
  "HNRSS High-Score",
  "Reddit r/popular",
  "Reddit r/all/top",
  "Reddit r/news",
  "Reddit r/worldnews",
  "Reddit r/technology",
  "Reddit r/movies",
  "Reddit r/Music",
  "Reddit r/television",
  "Reddit r/korea",
  "Reddit r/hanguk",
  // 한국발 핫이슈 시그널 (공식 RSS)
  "Google Trends KR Daily",
  "Google News KR Top",
  "Google News KR 연예",
  "Google News KR 스포츠",
  "인사이트",
  "위키트리",
];
