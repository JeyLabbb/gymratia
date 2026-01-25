-- Fix RLS policies for post_comments to allow deletion (Version 2 - Simplified)
-- Run this in your Supabase SQL Editor

-- ============================================
-- DROP ALL EXISTING UPDATE POLICIES
-- ============================================
-- Eliminar TODAS las políticas de UPDATE existentes para empezar limpio
DROP POLICY IF EXISTS "Users can update their own comments" ON post_comments;
DROP POLICY IF EXISTS "Users can update their own non-deleted comments" ON post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON post_comments;
DROP POLICY IF EXISTS "Post owners can delete comments on their posts" ON post_comments;

-- ============================================
-- CREATE SIMPLIFIED UPDATE POLICIES
-- ============================================

-- Política única y simple: El autor puede hacer UPDATE (incluyendo soft delete)
-- Esta política permite tanto actualizar el contenido como hacer soft delete
CREATE POLICY "Users can update their own comments"
  ON post_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política adicional: El dueño del post puede eliminar comentarios en su post
CREATE POLICY "Post owners can delete comments on their posts"
  ON post_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM social_posts
      WHERE social_posts.id = post_comments.post_id
      AND social_posts.user_id = auth.uid()
      AND social_posts.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM social_posts
      WHERE social_posts.id = post_comments.post_id
      AND social_posts.user_id = auth.uid()
      AND social_posts.deleted_at IS NULL
    )
  );

