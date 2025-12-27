-- Add qualification fields for MVP lead capture (embedded on landing page)
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS marketplace text,
  ADD COLUMN IF NOT EXISTS ad_spend_range text,
  ADD COLUMN IF NOT EXISTS primary_goal text,
  ADD COLUMN IF NOT EXISTS current_tool text,
  ADD COLUMN IF NOT EXISTS source_page text DEFAULT 'landing';