-- Fix RLS policies for post_comments - SIMPLEST VERSION
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
-- ENABLE RLS (por si acaso)
-- ============================================
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE POLICIES
-- ============================================

-- Política 1: El autor puede actualizar/eliminar su comentario
CREATE POLICY "comment_author_can_update"
  ON post_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política 2: El dueño del post puede eliminar comentarios
-- Usamos una función para simplificar la verificación
CREATE POLICY "post_owner_can_delete_comments"
  ON post_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM social_posts sp
      WHERE sp.id = post_comments.post_id
      AND sp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM social_posts sp
      WHERE sp.id = post_comments.post_id
      AND sp.user_id = auth.uid()
    )
  );

