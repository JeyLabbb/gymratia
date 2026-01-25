-- Fix RLS policies for post_comments - WORKING VERSION (based on social_posts pattern)
-- Run this in your Supabase SQL Editor

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
-- CREATE POLICIES (same pattern as social_posts)
-- ============================================

-- Política 1: Autor puede actualizar su comentario (si no está eliminado)
CREATE POLICY "Users can update their own comments"
  ON post_comments FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- Política 2: Autor puede eliminar (soft delete) su comentario
CREATE POLICY "Users can delete their own comments"
  ON post_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- Política 3: Dueño del post puede eliminar comentarios en su post
CREATE POLICY "Post owners can delete comments on their posts"
  ON post_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM social_posts
      WHERE social_posts.id = post_comments.post_id
      AND social_posts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM social_posts
      WHERE social_posts.id = post_comments.post_id
      AND social_posts.user_id = auth.uid()
    )
    AND deleted_at IS NOT NULL
  );

