-- Script para corregir la estructura de la tabla trainers
-- Ejecuta esto en Supabase SQL Editor si tienes problemas con la columna "name"

-- Verificar si existe la columna "name" y renombrarla a "trainer_name"
DO $$ 
BEGIN
  -- Si existe la columna "name" y NO existe "trainer_name", renombrar
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' 
    AND column_name = 'name'
    AND table_schema = 'public'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' 
    AND column_name = 'trainer_name'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE trainers RENAME COLUMN name TO trainer_name;
    RAISE NOTICE 'Columna "name" renombrada a "trainer_name"';
  END IF;
  
  -- Si existen ambas columnas, eliminar "name" después de copiar datos
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' 
    AND column_name = 'name'
    AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' 
    AND column_name = 'trainer_name'
    AND table_schema = 'public'
  ) THEN
    -- Copiar datos de "name" a "trainer_name" si trainer_name está vacío
    UPDATE trainers 
    SET trainer_name = name 
    WHERE (trainer_name IS NULL OR trainer_name = '') AND name IS NOT NULL;
    
    -- Eliminar la columna "name"
    ALTER TABLE trainers DROP COLUMN name;
    RAISE NOTICE 'Columna "name" eliminada después de copiar datos a "trainer_name"';
  END IF;
END $$;

-- Asegurar que trainer_name existe y es NOT NULL
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' 
    AND column_name = 'trainer_name'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE trainers ADD COLUMN trainer_name TEXT;
    RAISE NOTICE 'Columna "trainer_name" añadida';
  END IF;
  
  -- Si trainer_name puede ser NULL, actualizar valores NULL
  UPDATE trainers 
  SET trainer_name = COALESCE(trainer_name, full_name, email, 'Entrenador')
  WHERE trainer_name IS NULL OR trainer_name = '';
  
  -- Hacer NOT NULL si no lo es
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' 
    AND column_name = 'trainer_name'
    AND is_nullable = 'YES'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE trainers ALTER COLUMN trainer_name SET NOT NULL;
    RAISE NOTICE 'Columna "trainer_name" ahora es NOT NULL';
  END IF;
END $$;

