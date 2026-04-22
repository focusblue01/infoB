export interface DefaultRssSource {
  name: string;
  url: string;
}

export const DEFAULT_RSS_SOURCES: DefaultRssSource[] = [
  // 연합인포맥스
  { name: "연합인포맥스 전체기사", url: "https://news.einfomax.co.kr/rss/allArticle.xml" },
  { name: "연합인포맥스 인기기사", url: "https://news.einfomax.co.kr/rss/clickTop.xml" },
  { name: "연합인포맥스 증권", url: "https://news.einfomax.co.kr/rss/S1N2.xml" },
  { name: "연합인포맥스 IB/기업", url: "https://news.einfomax.co.kr/rss/S1N7.xml" },
  { name: "연합인포맥스 칼럼/이슈", url: "https://news.einfomax.co.kr/rss/S1N9.xml" },
  { name: "연합인포맥스 시사용어", url: "https://news.einfomax.co.kr/rss/S1N10.xml" },
  { name: "연합인포맥스 인물/동정", url: "https://news.einfomax.co.kr/rss/S1N11.xml" },
  { name: "연합인포맥스 외부기고", url: "https://news.einfomax.co.kr/rss/S1N12.xml" },
  { name: "연합인포맥스 기획기사", url: "https://news.einfomax.co.kr/rss/S1N13.xml" },
  { name: "연합인포맥스 정책/금융", url: "https://news.einfomax.co.kr/rss/S1N15.xml" },
  { name: "연합인포맥스 채권/외환", url: "https://news.einfomax.co.kr/rss/S1N16.xml" },
  { name: "연합인포맥스 부동산", url: "https://news.einfomax.co.kr/rss/S1N17.xml" },
  { name: "연합인포맥스 기고", url: "https://news.einfomax.co.kr/rss/S1N19.xml" },
  { name: "연합인포맥스 해외주식", url: "https://news.einfomax.co.kr/rss/S1N21.xml" },
  { name: "연합인포맥스 국제뉴스", url: "https://news.einfomax.co.kr/rss/S1N23.xml" },
  { name: "연합인포맥스 영상", url: "https://news.einfomax.co.kr/rss/S1N24.xml" },
  { name: "연합인포맥스 보도자료", url: "https://news.einfomax.co.kr/rss/S1N25.xml" },

  // 연합뉴스
  { name: "연합뉴스 최신기사", url: "https://www.yna.co.kr/rss/news.xml" },
  { name: "연합뉴스 정치", url: "https://www.yna.co.kr/rss/politics.xml" },
  { name: "연합뉴스 북한", url: "https://www.yna.co.kr/rss/northkorea.xml" },
  { name: "연합뉴스 경제", url: "https://www.yna.co.kr/rss/economy.xml" },
  { name: "연합뉴스 마켓+", url: "https://www.yna.co.kr/rss/market.xml" },
  { name: "연합뉴스 산업", url: "https://www.yna.co.kr/rss/industry.xml" },
  { name: "연합뉴스 사회", url: "https://www.yna.co.kr/rss/society.xml" },
  { name: "연합뉴스 전국", url: "https://www.yna.co.kr/rss/local.xml" },
  { name: "연합뉴스 세계", url: "https://www.yna.co.kr/rss/international.xml" },
  { name: "연합뉴스 문화", url: "https://www.yna.co.kr/rss/culture.xml" },
  { name: "연합뉴스 건강", url: "https://www.yna.co.kr/rss/health.xml" },
  { name: "연합뉴스 연예", url: "https://www.yna.co.kr/rss/entertainment.xml" },
  { name: "연합뉴스 스포츠", url: "https://www.yna.co.kr/rss/sports.xml" },
  { name: "연합뉴스 오피니언", url: "https://www.yna.co.kr/rss/opinion.xml" },
  { name: "연합뉴스 사람들", url: "https://www.yna.co.kr/rss/people.xml" },

  // 연합뉴스TV
  { name: "연합뉴스TV 최신", url: "http://www.yonhapnewstv.co.kr/browse/feed/" },
  { name: "연합뉴스TV 정치", url: "http://www.yonhapnewstv.co.kr/category/news/politics/feed/" },
  { name: "연합뉴스TV 경제", url: "http://www.yonhapnewstv.co.kr/category/news/economy/feed/" },
  { name: "연합뉴스TV 사회", url: "http://www.yonhapnewstv.co.kr/category/news/society/feed/" },
  { name: "연합뉴스TV 지역", url: "http://www.yonhapnewstv.co.kr/category/news/local/feed/" },
  { name: "연합뉴스TV 세계", url: "http://www.yonhapnewstv.co.kr/category/news/international/feed/" },
  { name: "연합뉴스TV 문화/연예", url: "http://www.yonhapnewstv.co.kr/category/news/culture/feed/" },
  { name: "연합뉴스TV 스포츠", url: "http://www.yonhapnewstv.co.kr/category/news/sports/feed/" },
  { name: "연합뉴스TV 날씨", url: "http://www.yonhapnewstv.co.kr/category/news/weather/feed/" },

  // 조선일보
  { name: "조선일보 전체기사", url: "https://www.chosun.com/arc/outboundfeeds/rss/?outputType=xml" },
  { name: "조선일보 정치", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/politics/?outputType=xml" },
  { name: "조선일보 경제", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml" },
  { name: "조선일보 사회", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/national/?outputType=xml" },
  { name: "조선일보 국제", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/international/?outputType=xml" },
  { name: "조선일보 문화/라이프", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/culture-life/?outputType=xml" },
  { name: "조선일보 오피니언", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/opinion/?outputType=xml" },
  { name: "조선일보 스포츠", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/sports/?outputType=xml" },
  { name: "조선일보 연예", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/entertainments/?outputType=xml" },
  { name: "조선일보 영문", url: "https://english.chosun.com/site/data/rss/rss.xml" },
];
