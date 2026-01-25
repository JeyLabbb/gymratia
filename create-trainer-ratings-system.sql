-- Sistema de valoraciones para entrenadores
-- Run this in your Supabase SQL Editor

-- Tabla de valoraciones
CREATE TABLE IF NOT EXISTS trainer_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_slug TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, trainer_slug)
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_trainer_ratings_trainer_slug ON trainer_ratings(trainer_slug);
CREATE INDEX IF NOT EXISTS idx_trainer_ratings_user_id ON trainer_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_ratings_rating ON trainer_ratings(rating);

-- Función para calcular promedio y total de valoraciones
CREATE OR REPLACE FUNCTION update_trainer_ratings_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar estadísticas en la tabla trainers
  UPDATE trainers
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0)
      FROM trainer_ratings
      WHERE trainer_ratings.trainer_slug = trainers.slug
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM trainer_ratings
      WHERE trainer_ratings.trainer_slug = trainers.slug
    ),
    updated_at = NOW()
  WHERE trainers.slug = NEW.trainer_slug OR trainers.slug = OLD.trainer_slug;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar estadísticas cuando se inserta/actualiza/elimina una valoración
DROP TRIGGER IF EXISTS trigger_update_trainer_ratings_stats ON trainer_ratings;
CREATE TRIGGER trigger_update_trainer_ratings_stats
  AFTER INSERT OR UPDATE OR DELETE ON trainer_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_trainer_ratings_stats();

-- Función para contar alumnos activos (con chat abierto)
CREATE OR REPLACE FUNCTION update_trainer_active_students()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar número de alumnos activos en trainers
  UPDATE trainers
  SET 
    active_students = (
      SELECT COUNT(DISTINCT user_id)
      FROM trainer_chats
      WHERE trainer_chats.trainer_slug = trainers.slug
    ),
    updated_at = NOW()
  WHERE trainers.slug = NEW.trainer_slug OR trainers.slug = OLD.trainer_slug;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar alumnos activos cuando se crea/elimina un chat
DROP TRIGGER IF EXISTS trigger_update_trainer_active_students ON trainer_chats;
CREATE TRIGGER trigger_update_trainer_active_students
  AFTER INSERT OR DELETE ON trainer_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_trainer_active_students();

-- Habilitar RLS
ALTER TABLE trainer_ratings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para trainer_ratings
DROP POLICY IF EXISTS "Users can view all ratings" ON trainer_ratings;
CREATE POLICY "Users can view all ratings"
  ON trainer_ratings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own rating" ON trainer_ratings;
CREATE POLICY "Users can insert their own rating"
  ON trainer_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own rating" ON trainer_ratings;
CREATE POLICY "Users can update their own rating"
  ON trainer_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own rating" ON trainer_ratings;
CREATE POLICY "Users can delete their own rating"
  ON trainer_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Añadir columna is_featured si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE trainers ADD COLUMN is_featured BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_trainers_is_featured ON trainers(is_featured);
  END IF;
END $$;

-- Actualizar estadísticas iniciales para entrenadores existentes
UPDATE trainers
SET 
  average_rating = COALESCE((
    SELECT AVG(rating)::NUMERIC(3,2)
    FROM trainer_ratings
    WHERE trainer_ratings.trainer_slug = trainers.slug
  ), 0),
  total_ratings = COALESCE((
    SELECT COUNT(*)
    FROM trainer_ratings
    WHERE trainer_ratings.trainer_slug = trainers.slug
  ), 0),
  active_students = COALESCE((
    SELECT COUNT(DISTINCT user_id)
    FROM trainer_chats
    WHERE trainer_chats.trainer_slug = trainers.slug
  ), 0);

-- Marcar a Jey como destacado (si existe)
UPDATE trainers
SET is_featured = true
WHERE slug = 'jey';
