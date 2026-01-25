-- Fix RLS policies for post_comments to allow deletion
-- Run this in your Supabase SQL Editor

-- ============================================
-- DROP EXISTING UPDATE POLICIES
-- ============================================
-- Eliminar todas las políticas de UPDATE existentes para evitar conflictos
DROP POLICY IF EXISTS "Users can update their own comments" ON post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON post_comments;
DROP POLICY IF EXISTS "Post owners can delete comments on their posts" ON post_comments;

-- ============================================
-- CREATE NEW UPDATE POLICIES
-- ============================================

-- Política 1: El autor puede actualizar su comentario (si no está eliminado)
CREATE POLICY "Users can update their own non-deleted comments"
  ON post_comments FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

-- Política 2: El autor puede eliminar (soft delete) su comentario
CREATE POLICY "Users can delete their own comments"
  ON post_comments FOR UPDATE
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    AND deleted_at IS NOT NULL
  );

-- Política 3: El dueño del post puede eliminar comentarios en su post
CREATE POLICY "Post owners can delete comments on their posts"
  ON post_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM social_posts
      WHERE social_posts.id = post_comments.post_id
      AND social_posts.user_id = auth.uid()
      AND social_posts.deleted_at IS NULL
    )
    AND post_comments.deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM social_posts
      WHERE social_posts.id = post_comments.post_id
      AND social_posts.user_id = auth.uid()
      AND social_posts.deleted_at IS NULL
    )
    AND deleted_at IS NOT NULL
  );

