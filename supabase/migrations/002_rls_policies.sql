-- ============================================
-- Row Level Security Policies
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Profiles: 본인만
CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- User categories: 본인만
CREATE POLICY "Users manage own categories" ON user_categories
  FOR ALL USING (auth.uid() = user_id);

-- User keywords: 본인만
CREATE POLICY "Users manage own keywords" ON user_keywords
  FOR ALL USING (auth.uid() = user_id);

-- User sources: 본인만
CREATE POLICY "Users manage own sources" ON user_sources
  FOR ALL USING (auth.uid() = user_id);

-- Interest groups: 인증 사용자 전체 읽기
CREATE POLICY "Authenticated read interest_groups" ON interest_groups
  FOR SELECT USING (auth.role() = 'authenticated');

-- Articles: 인증 사용자 전체 읽기
CREATE POLICY "Authenticated read articles" ON articles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Summaries: 인증 사용자 전체 읽기 (공유 요약)
CREATE POLICY "Authenticated read summaries" ON summaries
  FOR SELECT USING (auth.role() = 'authenticated');

-- Bookmarks: 본인만
CREATE POLICY "Users manage own bookmarks" ON bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- Feedback: 본인만
CREATE POLICY "Users manage own feedback" ON feedback
  FOR ALL USING (auth.uid() = user_id);
