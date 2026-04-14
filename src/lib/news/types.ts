export interface RawArticle {
  externalId: string;
  sourceName: string;
  sourceUrl: string | null;
  title: string;
  description: string | null;
  content: string | null;
  imageUrl: string | null;
  author: string | null;
  publishedAt: string | null;
  matchedKeywords: string[];
}
