-- Add English translation columns to summaries
ALTER TABLE public.summaries
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS content_en TEXT;
