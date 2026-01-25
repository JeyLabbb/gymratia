-- Add comment likes table and update RLS policies
-- Run this in your Supabase SQL Editor

-- ============================================
-- COMMENT LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id) -- Un usuario solo puede dar like una vez por comentario
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver likes de comentarios
CREATE POLICY "Anyone can view comment likes"
  ON comment_likes FOR SELECT
  USING (true);

-- Usuarios autenticados pueden dar like a comentarios
CREATE POLICY "Authenticated users can like comments"
  ON comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden quitar su propio like
CREATE POLICY "Users can unlike their own likes"
  ON comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- UPDATE COMMENT RLS POLICIES
-- ============================================
-- Permitir que el dueño del post elimine comentarios en su post
-- Primero eliminamos la política antigua si existe
DROP POLICY IF EXISTS "Users can delete their own comments" ON post_comments;

-- Nueva política: el autor puede eliminar su comentario
CREATE POLICY "Users can delete their own comments"
  ON post_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (deleted_at IS NOT NULL);

-- Nueva política: el dueño del post puede eliminar comentarios en su post
CREATE POLICY "Post owners can delete comments on their posts"
  ON post_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM social_posts
      WHERE social_posts.id = post_comments.post_id
      AND social_posts.user_id = auth.uid()
    )
  )
  WITH CHECK (deleted_at IS NOT NULL);

