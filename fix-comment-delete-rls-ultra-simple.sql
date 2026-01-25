-- Fix RLS policies for post_comments - ULTRA SIMPLE VERSION
-- Run this in your Supabase SQL Editor
-- This version is the most permissive that should work

-- ============================================
-- DROP ALL EXISTING UPDATE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can update their own comments" ON post_comments;
DROP POLICY IF EXISTS "Users can update their own non-deleted comments" ON post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON post_comments;
DROP POLICY IF EXISTS "Post owners can delete comments on their posts" ON post_comments;
DROP POLICY IF EXISTS "Users can update or delete their own comments or comments on their posts" ON post_comments;
DROP POLICY IF EXISTS "comment_author_can_update" ON post_comments;
DROP POLICY IF EXISTS "post_owner_can_delete_comments" ON post_comments;
DROP POLICY IF EXISTS "comment_author_full_update" ON post_comments;
DROP POLICY IF EXISTS "post_owner_can_update_comments" ON post_comments;

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE ULTRA SIMPLE POLICIES
-- ============================================
-- Política 1: Autor puede hacer cualquier UPDATE
CREATE POLICY "author_can_update_comment"
  ON post_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (true);  -- Sin restricciones en WITH CHECK

-- Política 2: Dueño del post puede hacer cualquier UPDATE en comentarios de su post
CREATE POLICY "post_owner_can_update_comment"
  ON post_comments FOR UPDATE
  USING (
    post_id IN (
      SELECT id FROM social_posts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (true);  -- Sin restricciones en WITH CHECK

