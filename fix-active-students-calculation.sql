-- Fix para el cálculo de active_students
-- Este script mejora el trigger y recalcula todos los valores

-- 1. Mejorar la función para que funcione correctamente con UPDATE también
CREATE OR REPLACE FUNCTION update_trainer_active_students()
RETURNS TRIGGER AS $$
DECLARE
  affected_slug TEXT;
BEGIN
  -- Determinar qué slug fue afectado
  IF TG_OP = 'DELETE' THEN
    affected_slug := OLD.trainer_slug;
  ELSE
    affected_slug := NEW.trainer_slug;
  END IF;
  
  -- Actualizar número de alumnos activos en trainers
  UPDATE trainers
  SET 
    active_students = (
      SELECT COUNT(DISTINCT user_id)
      FROM trainer_chats
      WHERE trainer_chats.trainer_slug = trainers.slug
    ),
    updated_at = NOW()
  WHERE trainers.slug = affected_slug;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Mejorar el trigger para que también se ejecute en UPDATE
DROP TRIGGER IF EXISTS trigger_update_trainer_active_students ON trainer_chats;
CREATE TRIGGER trigger_update_trainer_active_students
  AFTER INSERT OR UPDATE OR DELETE ON trainer_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_trainer_active_students();

-- 3. Recalcular todos los active_students para todos los entrenadores
UPDATE trainers
SET 
  active_students = COALESCE((
    SELECT COUNT(DISTINCT user_id)
    FROM trainer_chats
    WHERE trainer_chats.trainer_slug = trainers.slug
  ), 0),
  updated_at = NOW();

-- 4. Función auxiliar para recalcular manualmente si es necesario
CREATE OR REPLACE FUNCTION recalculate_all_trainer_active_students()
RETURNS void AS $$
BEGIN
  UPDATE trainers
  SET 
    active_students = COALESCE((
      SELECT COUNT(DISTINCT user_id)
      FROM trainer_chats
      WHERE trainer_chats.trainer_slug = trainers.slug
    ), 0),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
