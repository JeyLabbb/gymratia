-- Añadir constraint UNIQUE case-insensitive para trainer_name
-- Ejecuta esto en Supabase SQL Editor

-- Crear índice único case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS idx_trainers_trainer_name_unique 
ON trainers (LOWER(TRIM(trainer_name)));

-- Añadir campos faltantes para edición de perfil si no existen
DO $$ 
BEGIN
  -- Añadir campos para stats editables
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'intensity') THEN
    ALTER TABLE trainers ADD COLUMN intensity INTEGER DEFAULT 5;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'flexibility') THEN
    ALTER TABLE trainers ADD COLUMN flexibility INTEGER DEFAULT 5;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'cycle_weeks') THEN
    ALTER TABLE trainers ADD COLUMN cycle_weeks INTEGER DEFAULT 8;
  END IF;
  
  -- Añadir campos para "Ideal para ti si..."
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'ideal_for') THEN
    ALTER TABLE trainers ADD COLUMN ideal_for TEXT[];
  END IF;
  
  -- Añadir campo para "Qué te ofrece" (array de objetos con título, descripción, icono)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'offers') THEN
    ALTER TABLE trainers ADD COLUMN offers JSONB;
  END IF;
  
  -- Añadir campos de contacto y redes sociales
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'social_media') THEN
    ALTER TABLE trainers ADD COLUMN social_media JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'contact_phone') THEN
    ALTER TABLE trainers ADD COLUMN contact_phone TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'contact_email') THEN
    ALTER TABLE trainers ADD COLUMN contact_email TEXT;
  END IF;
END $$;

