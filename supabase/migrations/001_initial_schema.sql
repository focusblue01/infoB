-- ============================================
-- Daily News Digest - Initial Schema
-- ============================================

-- 카테고리 ENUM
CREATE TYPE news_category AS ENUM (
  'technology', 'economy', 'politics', 'society',
  'culture', 'sports', 'science', 'global'
);

-- ============================================
-- 사용자 프로필
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  notification_enabled BOOLEAN DEFAULT true,
  notification_time TIME DEFAULT '07:00',
  timezone TEXT DEFAULT 'Asia/Seoul',
  onboarding_completed BOOLEAN DEFAULT false,
  streak_count INTEGER DEFAULT 0,
  last_read_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 사용자 카테고리
CREATE TABLE public.user_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category news_category NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category)
);

-- 사용자 키워드 (is_exclude로 제외 키워드 관리)
CREATE TABLE public.user_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  is_exclude BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, keyword)
);

-- 사용자 RSS 소스
CREATE TABLE public.user_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, url)
);

-- ============================================
-- 관심사 그룹 (공유 요약 단위)
-- ============================================
CREATE TABLE public.interest_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_type TEXT NOT NULL CHECK (group_type IN ('category', 'keyword')),
  group_key TEXT NOT NULL,
  similar_keywords TEXT[] DEFAULT '{}',
  subscriber_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_type, group_key)
);

-- ============================================
-- 수집된 기사 (공유 풀)
-- ============================================
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  source_name TEXT NOT NULL,
  source_url TEXT,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  image_url TEXT,
  author TEXT,
  category news_category,
  matched_keywords TEXT[] DEFAULT '{}',
  is_major BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_articles_published ON articles(published_at DESC);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_collected ON articles(collected_at DESC);

-- ============================================
-- AI 요약 (관심사 그룹별 공유)
-- ============================================
CREATE TABLE public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_group_id UUID REFERENCES interest_groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category news_category,
  keywords TEXT[] DEFAULT '{}',
  article_ids UUID[] DEFAULT '{}',
  briefing_date DATE NOT NULL,
  prompt_version TEXT DEFAULT 'v1',
  model_used TEXT DEFAULT 'claude-sonnet-4-6',
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_summaries_date ON summaries(briefing_date DESC);
CREATE INDEX idx_summaries_group_date ON summaries(interest_group_id, briefing_date DESC);

-- 풀텍스트 검색용 (Phase 2)
ALTER TABLE summaries ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED;
CREATE INDEX idx_summaries_search ON summaries USING gin(search_vector);

-- ============================================
-- 북마크 & 피드백
-- ============================================
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_id UUID NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, summary_id)
);

CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_id UUID NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
  is_positive BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, summary_id)
);

-- ============================================
-- 트리거: 회원가입 시 프로필 자동 생성
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
