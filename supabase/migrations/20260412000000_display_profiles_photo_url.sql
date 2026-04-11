-- Add house photo URL to display profiles
-- Applied manually to Supabase on April 12, 2026
-- This file documents the migration for version control purposes

ALTER TABLE public.display_profiles
ADD COLUMN IF NOT EXISTS photo_url text;

COMMENT ON COLUMN public.display_profiles.photo_url
IS 'Persisted URL of uploaded house background photo from house-photos bucket.';
