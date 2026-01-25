-- Update post_views table to track views per hour instead of per day
-- Run this in your Supabase SQL Editor

-- ============================================
-- UPDATE POST VIEWS TABLE
-- ============================================

-- Primero, eliminar la columna viewed_date y su constraint UNIQUE
ALTER TABLE post_views DROP CONSTRAINT IF EXISTS post_views_post_id_user_id_viewed_date_key;
ALTER TABLE post_views DROP COLUMN IF EXISTS viewed_date;

-- Crear función inmutable para truncar a la hora
CREATE OR REPLACE FUNCTION truncate_to_hour(ts TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE SQL
IMMUTABLE
STRICT
AS $$
  SELECT (date_trunc('hour', ts AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
$$;

-- Añadir nueva columna viewed_hour que agrupa por hora usando la función inmutable
ALTER TABLE post_views ADD COLUMN IF NOT EXISTS viewed_hour TIMESTAMPTZ 
  GENERATED ALWAYS AS (truncate_to_hour(viewed_at)) STORED;

-- Crear nuevo constraint UNIQUE para (post_id, user_id, viewed_hour)
-- Esto permite máximo 1 vista por usuario por hora por publicación
ALTER TABLE post_views ADD CONSTRAINT post_views_post_id_user_id_viewed_hour_key 
  UNIQUE(post_id, user_id, viewed_hour);

-- Actualizar índices
DROP INDEX IF EXISTS idx_post_views_viewed_date;
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_hour ON post_views(viewed_hour DESC);
CREATE INDEX IF NOT EXISTS idx_post_views_post_id_user_id_hour ON post_views(post_id, user_id, viewed_hour);

