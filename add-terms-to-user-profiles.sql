-- Add terms acceptance columns to user_profiles
-- Run in Supabase SQL Editor

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- Existing users: consider them as having accepted if they have a profile (grandfather)
-- UPDATE user_profiles SET terms_accepted_at = created_at, terms_version = '2026-02-02' WHERE terms_accepted_at IS NULL;
-- Uncomment above when ready to grandfather existing users
