-- Create social media features structure for GymRatIA
-- Run this in your Supabase SQL Editor
-- This includes: posts, likes, comments, follows, shares, and statistics

-- ============================================
-- POSTS TABLE (Publicaciones)
-- ============================================
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT, -- Texto del post (puede ser null si solo es imagen/video)
  post_type TEXT NOT NULL DEFAULT 'photo' CHECK (post_type IN ('photo', 'video', 'thread', 'text')),
  media_urls JSONB, -- Array de URLs: ["url1", "url2"] para múltiples fotos/videos
  is_trainer BOOLEAN DEFAULT false, -- Para diferenciar entrenadores de alumnos
  tags TEXT[], -- Array de tags: ['gym', 'dieta', 'ejercicio']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- ============================================
-- POST LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id) -- Un usuario solo puede dar like una vez por post
);

-- ============================================
-- POST COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE, -- Para respuestas a comentarios
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- ============================================
-- POST SHARES TABLE (Compartir link)
-- ============================================
CREATE TABLE IF NOT EXISTS post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id) -- Un usuario solo puede compartir una vez (para estadísticas)
);

-- ============================================
-- FOLLOWS TABLE (Seguir usuarios)
-- ============================================
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Quien sigue
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- A quien sigue
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id), -- No puedes seguir dos veces a la misma persona
  CHECK (follower_id != following_id) -- No puedes seguirte a ti mismo
);

-- ============================================
-- POST VIEWS TABLE (Estadísticas de visitas)
-- ============================================
CREATE TABLE IF NOT EXISTS post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id UUID, -- NULL si es visita anónima
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_date DATE GENERATED ALWAYS AS ((viewed_at AT TIME ZONE 'UTC')::DATE) STORED, -- Fecha calculada automáticamente (inmutable)
  -- Un usuario cuenta como 1 visita por día (usando la fecha, no el timestamp)
  UNIQUE(post_id, user_id, viewed_date)
);

-- ============================================
-- INDEXES para optimizar consultas
-- ============================================
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_is_trainer ON social_posts(is_trainer);
CREATE INDEX IF NOT EXISTS idx_social_posts_deleted_at ON social_posts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_social_posts_tags ON social_posts USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON post_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_post_comments_deleted_at ON post_comments(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_user_id ON post_shares(user_id);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at ON post_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_date ON post_views(viewed_date DESC);
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON post_views(user_id) WHERE user_id IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: social_posts
-- ============================================
-- Todos pueden ver posts no eliminados
CREATE POLICY "Anyone can view non-deleted posts"
  ON social_posts FOR SELECT
  USING (deleted_at IS NULL);

-- Solo el autor puede actualizar su post
CREATE POLICY "Users can update their own posts"
  ON social_posts FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Solo el autor puede eliminar su post (soft delete)
CREATE POLICY "Users can delete their own posts"
  ON social_posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (deleted_at IS NOT NULL);

-- Usuarios autenticados pueden crear posts
CREATE POLICY "Authenticated users can create posts"
  ON social_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: post_likes
-- ============================================
-- Todos pueden ver likes
CREATE POLICY "Anyone can view likes"
  ON post_likes FOR SELECT
  USING (true);

-- Usuarios autenticados pueden dar like
CREATE POLICY "Authenticated users can like posts"
  ON post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Solo puedes quitar tu propio like
CREATE POLICY "Users can unlike their own likes"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: post_comments
-- ============================================
-- Todos pueden ver comentarios no eliminados
CREATE POLICY "Anyone can view non-deleted comments"
  ON post_comments FOR SELECT
  USING (deleted_at IS NULL);

-- Usuarios autenticados pueden comentar
CREATE POLICY "Authenticated users can comment"
  ON post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Solo el autor puede actualizar su comentario
CREATE POLICY "Users can update their own comments"
  ON post_comments FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Solo el autor puede eliminar su comentario
CREATE POLICY "Users can delete their own comments"
  ON post_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (deleted_at IS NOT NULL);

-- ============================================
-- RLS POLICIES: post_shares
-- ============================================
-- Todos pueden ver shares
CREATE POLICY "Anyone can view shares"
  ON post_shares FOR SELECT
  USING (true);

-- Usuarios autenticados pueden compartir
CREATE POLICY "Authenticated users can share posts"
  ON post_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: user_follows
-- ============================================
-- Todos pueden ver quién sigue a quién
CREATE POLICY "Anyone can view follows"
  ON user_follows FOR SELECT
  USING (true);

-- Usuarios autenticados pueden seguir
CREATE POLICY "Authenticated users can follow"
  ON user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Solo puedes dejar de seguir tus propios follows
CREATE POLICY "Users can unfollow"
  ON user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================
-- RLS POLICIES: post_views
-- ============================================
-- Solo el autor puede ver estadísticas de visitas de sus posts
CREATE POLICY "Post authors can view their post stats"
  ON post_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM social_posts
      WHERE social_posts.id = post_views.post_id
      AND social_posts.user_id = auth.uid()
    )
  );

-- Cualquiera puede registrar una visita (para estadísticas)
CREATE POLICY "Anyone can register a view"
  ON post_views FOR INSERT
  WITH CHECK (true);

-- ============================================
-- FUNCTIONS para estadísticas
-- ============================================

-- Función para obtener likes de un post
CREATE OR REPLACE FUNCTION get_post_likes_count(post_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM post_likes
  WHERE post_id = post_uuid;
$$ LANGUAGE SQL STABLE;

-- Función para obtener comentarios de un post
CREATE OR REPLACE FUNCTION get_post_comments_count(post_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM post_comments
  WHERE post_id = post_uuid AND deleted_at IS NULL;
$$ LANGUAGE SQL STABLE;

-- Función para obtener shares de un post
CREATE OR REPLACE FUNCTION get_post_shares_count(post_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM post_shares
  WHERE post_id = post_uuid;
$$ LANGUAGE SQL STABLE;

-- Función para obtener visitas de un post (únicas por día)
CREATE OR REPLACE FUNCTION get_post_views_count(post_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT COALESCE(user_id::TEXT, viewed_at::TEXT))::INTEGER
  FROM post_views
  WHERE post_id = post_uuid
  AND viewed_date = CURRENT_DATE;
$$ LANGUAGE SQL STABLE;

-- Función para obtener "viral score" (likes + visitas del día)
CREATE OR REPLACE FUNCTION get_post_viral_score(post_uuid UUID)
RETURNS INTEGER AS $$
  SELECT 
    (get_post_likes_count(post_uuid) + get_post_views_count(post_uuid))::INTEGER;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- TRIGGERS para updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at
  BEFORE UPDATE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

