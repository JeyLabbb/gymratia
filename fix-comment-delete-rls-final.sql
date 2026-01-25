-- Fix RLS policies for post_comments to allow deletion (FINAL VERSION)
-- Run this in your Supabase SQL Editor

-- ============================================
-- DROP ALL EXISTING UPDATE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can update their own comments" ON post_comments;
DROP POLICY IF EXISTS "Users can update their own non-deleted comments" ON post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON post_comments;
DROP POLICY IF EXISTS "Post owners can delete comments on their posts" ON post_comments;
DROP POLICY IF EXISTS "Users can update or delete their own comments or comments on their posts" ON post_comments;

-- ============================================
-- CREATE SINGLE PERMISSIVE POLICY
-- ============================================
-- Una sola política que permite UPDATE si:
-- 1. El usuario es el autor del comentario, O
-- 2. El usuario es el dueño del post

CREATE POLICY "Users can update or delete their own comments or comments on their posts"
  ON post_comments FOR UPDATE
  USING (
    -- Puede actualizar si es el autor
    auth.uid() = user_id
    OR
    -- O si es el dueño del post
    EXISTS (
      SELECT 1 FROM social_posts
      WHERE social_posts.id = post_comments.post_id
      AND social_posts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Misma verificación para la nueva fila
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM social_posts
      WHERE social_posts.id = post_comments.post_id
      AND social_posts.user_id = auth.uid()
    )
  );

