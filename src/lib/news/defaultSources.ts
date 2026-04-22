import type { NewsCategory } from "@/types";

export interface DefaultRssSource {
  name: string;
  url: string;
  category?: NewsCategory;
  priority?: number; // 낮을수록 우선순위 높음 (기본 10)
}

export const DEFAULT_RSS_SOURCES: DefaultRssSource[] = [
  // 연합인포맥스 (priority=1, 금융/경제 특화)
  { name: "연합인포맥스 전체기사", url: "https://news.einfomax.co.kr/rss/allArticle.xml", priority: 1 },
  { name: "연합인포맥스 인기기사", url: "https://news.einfomax.co.kr/rss/clickTop.xml", priority: 1 },
  { name: "연합인포맥스 증권", url: "https://news.einfomax.co.kr/rss/S1N2.xml", category: "economy", priority: 1 },
  { name: "연합인포맥스 IB/기업", url: "https://news.einfomax.co.kr/rss/S1N7.xml", category: "economy", priority: 1 },
  { name: "연합인포맥스 칼럼/이슈", url: "https://news.einfomax.co.kr/rss/S1N9.xml", priority: 1 },
  { name: "연합인포맥스 시사용어", url: "https://news.einfomax.co.kr/rss/S1N10.xml", priority: 1 },
  { name: "연합인포맥스 인물/동정", url: "https://news.einfomax.co.kr/rss/S1N11.xml", priority: 1 },
  { name: "연합인포맥스 외부기고", url: "https://news.einfomax.co.kr/rss/S1N12.xml", priority: 1 },
  { name: "연합인포맥스 기획기사", url: "https://news.einfomax.co.kr/rss/S1N13.xml", priority: 1 },
  { name: "연합인포맥스 정책/금융", url: "https://news.einfomax.co.kr/rss/S1N15.xml", category: "economy", priority: 1 },
  { name: "연합인포맥스 채권/외환", url: "https://news.einfomax.co.kr/rss/S1N16.xml", category: "economy", priority: 1 },
  { name: "연합인포맥스 부동산", url: "https://news.einfomax.co.kr/rss/S1N17.xml", category: "economy", priority: 1 },
  { name: "연합인포맥스 기고", url: "https://news.einfomax.co.kr/rss/S1N19.xml", priority: 1 },
  { name: "연합인포맥스 해외주식", url: "https://news.einfomax.co.kr/rss/S1N21.xml", category: "economy", priority: 1 },
  { name: "연합인포맥스 국제뉴스", url: "https://news.einfomax.co.kr/rss/S1N23.xml", category: "global", priority: 1 },
  { name: "연합인포맥스 영상", url: "https://news.einfomax.co.kr/rss/S1N24.xml", priority: 1 },
  { name: "연합인포맥스 보도자료", url: "https://news.einfomax.co.kr/rss/S1N25.xml", priority: 1 },

  // 연합뉴스 (priority=1)
  { name: "연합뉴스 최신기사", url: "https://www.yna.co.kr/rss/news.xml", priority: 1 },
  { name: "연합뉴스 정치", url: "https://www.yna.co.kr/rss/politics.xml", category: "politics", priority: 1 },
  { name: "연합뉴스 북한", url: "https://www.yna.co.kr/rss/northkorea.xml", category: "politics", priority: 1 },
  { name: "연합뉴스 경제", url: "https://www.yna.co.kr/rss/economy.xml", category: "economy", priority: 1 },
  { name: "연합뉴스 마켓+", url: "https://www.yna.co.kr/rss/market.xml", category: "economy", priority: 1 },
  { name: "연합뉴스 산업", url: "https://www.yna.co.kr/rss/industry.xml", category: "technology", priority: 1 },
  { name: "연합뉴스 사회", url: "https://www.yna.co.kr/rss/society.xml", category: "society", priority: 1 },
  { name: "연합뉴스 전국", url: "https://www.yna.co.kr/rss/local.xml", category: "society", priority: 1 },
  { name: "연합뉴스 세계", url: "https://www.yna.co.kr/rss/international.xml", category: "global", priority: 1 },
  { name: "연합뉴스 문화", url: "https://www.yna.co.kr/rss/culture.xml", category: "culture", priority: 1 },
  { name: "연합뉴스 건강", url: "https://www.yna.co.kr/rss/health.xml", category: "science", priority: 1 },
  { name: "연합뉴스 연예", url: "https://www.yna.co.kr/rss/entertainment.xml", category: "culture", priority: 1 },
  { name: "연합뉴스 스포츠", url: "https://www.yna.co.kr/rss/sports.xml", category: "sports", priority: 1 },
  { name: "연합뉴스 오피니언", url: "https://www.yna.co.kr/rss/opinion.xml", priority: 1 },
  { name: "연합뉴스 사람들", url: "https://www.yna.co.kr/rss/people.xml", priority: 1 },

  // 연합뉴스TV (priority=1)
  { name: "연합뉴스TV 최신", url: "http://www.yonhapnewstv.co.kr/browse/feed/", priority: 1 },
  { name: "연합뉴스TV 정치", url: "http://www.yonhapnewstv.co.kr/category/news/politics/feed/", category: "politics", priority: 1 },
  { name: "연합뉴스TV 경제", url: "http://www.yonhapnewstv.co.kr/category/news/economy/feed/", category: "economy", priority: 1 },
  { name: "연합뉴스TV 사회", url: "http://www.yonhapnewstv.co.kr/category/news/society/feed/", category: "society", priority: 1 },
  { name: "연합뉴스TV 지역", url: "http://www.yonhapnewstv.co.kr/category/news/local/feed/", category: "society", priority: 1 },
  { name: "연합뉴스TV 세계", url: "http://www.yonhapnewstv.co.kr/category/news/international/feed/", category: "global", priority: 1 },
  { name: "연합뉴스TV 문화/연예", url: "http://www.yonhapnewstv.co.kr/category/news/culture/feed/", category: "culture", priority: 1 },
  { name: "연합뉴스TV 스포츠", url: "http://www.yonhapnewstv.co.kr/category/news/sports/feed/", category: "sports", priority: 1 },
  { name: "연합뉴스TV 날씨", url: "http://www.yonhapnewstv.co.kr/category/news/weather/feed/", priority: 1 },

  // 조선일보 (priority=5)
  { name: "조선일보 전체기사", url: "https://www.chosun.com/arc/outboundfeeds/rss/?outputType=xml", priority: 5 },
  { name: "조선일보 정치", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/politics/?outputType=xml", category: "politics", priority: 5 },
  { name: "조선일보 경제", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml", category: "economy", priority: 5 },
  { name: "조선일보 사회", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/national/?outputType=xml", category: "society", priority: 5 },
  { name: "조선일보 국제", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/international/?outputType=xml", category: "global", priority: 5 },
  { name: "조선일보 문화/라이프", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/culture-life/?outputType=xml", category: "culture", priority: 5 },
  { name: "조선일보 오피니언", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/opinion/?outputType=xml", priority: 5 },
  { name: "조선일보 스포츠", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/sports/?outputType=xml", category: "sports", priority: 5 },
  { name: "조선일보 연예", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/entertainments/?outputType=xml", category: "culture", priority: 5 },
  { name: "조선일보 영문", url: "https://english.chosun.com/site/data/rss/rss.xml", priority: 5 },
];
