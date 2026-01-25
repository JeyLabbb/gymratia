-- Alternative: Update post_views table to track views per hour (using only immutable operations)
-- Use this if the function-based approach doesn't work
-- Run this in your Supabase SQL Editor

-- ============================================
-- UPDATE POST VIEWS TABLE
-- ============================================

-- Primero, eliminar la columna viewed_date y su constraint UNIQUE
ALTER TABLE post_views DROP CONSTRAINT IF EXISTS post_views_post_id_user_id_viewed_date_key;
ALTER TABLE post_views DROP COLUMN IF EXISTS viewed_date;

-- Añadir nueva columna viewed_hour usando solo operaciones inmutables
-- Calcula la hora truncando minutos, segundos y microsegundos
ALTER TABLE post_views ADD COLUMN IF NOT EXISTS viewed_hour TIMESTAMPTZ 
  GENERATED ALWAYS AS (
    make_timestamptz(
      EXTRACT(YEAR FROM viewed_at)::INTEGER,
      EXTRACT(MONTH FROM viewed_at)::INTEGER,
      EXTRACT(DAY FROM viewed_at)::INTEGER,
      EXTRACT(HOUR FROM viewed_at)::INTEGER,
      0, -- minutos
      0, -- segundos
      'UTC'
    )
  ) STORED;

-- Crear nuevo constraint UNIQUE para (post_id, user_id, viewed_hour)
ALTER TABLE post_views ADD CONSTRAINT post_views_post_id_user_id_viewed_hour_key 
  UNIQUE(post_id, user_id, viewed_hour);

-- Actualizar índices
DROP INDEX IF EXISTS idx_post_views_viewed_date;
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_hour ON post_views(viewed_hour DESC);
CREATE INDEX IF NOT EXISTS idx_post_views_post_id_user_id_hour ON post_views(post_id, user_id, viewed_hour);

