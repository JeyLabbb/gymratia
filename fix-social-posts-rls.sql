-- Fix RLS policies for social_posts to allow authenticated users to create posts
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view non-deleted posts" ON social_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON social_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON social_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON social_posts;

-- Recreate policies with proper checks
-- Anyone can view non-deleted posts
CREATE POLICY "Anyone can view non-deleted posts"
  ON social_posts FOR SELECT
  USING (deleted_at IS NULL);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
  ON social_posts FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts (soft delete)
CREATE POLICY "Users can delete their own posts"
  ON social_posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
  ON social_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

