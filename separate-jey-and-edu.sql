-- Separar Jey y Edu como entrenadores distintos
-- Jey: entrenador real de jeylabbb@gmail.com (con user_id)
-- Edu: entrenador del sistema (sin user_id)
-- Run this in your Supabase SQL Editor
-- IMPORTANTE: Ejecuta primero update-constraints-for-jey.sql para actualizar las constraints

-- Actualizar constraints para aceptar 'jey' además de 'edu' y 'carolina'
ALTER TABLE trainer_chats 
DROP CONSTRAINT IF EXISTS trainer_chats_trainer_slug_check;

ALTER TABLE trainer_chats 
ADD CONSTRAINT trainer_chats_trainer_slug_check 
CHECK (trainer_slug IN ('edu', 'carolina', 'jey'));

ALTER TABLE user_workouts 
DROP CONSTRAINT IF EXISTS user_workouts_trainer_slug_check;

ALTER TABLE user_workouts 
ADD CONSTRAINT user_workouts_trainer_slug_check 
CHECK (trainer_slug IN ('edu', 'carolina', 'jey'));

ALTER TABLE user_diets 
DROP CONSTRAINT IF EXISTS user_diets_trainer_slug_check;

ALTER TABLE user_diets 
ADD CONSTRAINT user_diets_trainer_slug_check 
CHECK (trainer_slug IN ('edu', 'carolina', 'jey'));

ALTER TABLE meal_planners 
DROP CONSTRAINT IF EXISTS meal_planners_trainer_slug_check;

ALTER TABLE meal_planners 
ADD CONSTRAINT meal_planners_trainer_slug_check 
CHECK (trainer_slug IN ('edu', 'carolina', 'jey'));

ALTER TABLE user_food_categories 
DROP CONSTRAINT IF EXISTS user_food_categories_trainer_slug_check;

ALTER TABLE user_food_categories 
ADD CONSTRAINT user_food_categories_trainer_slug_check 
CHECK (trainer_slug IN ('edu', 'carolina', 'jey'));

-- Asegurar que user_id puede ser NULL en trainers (para entrenadores del sistema)
DO $$
BEGIN
  -- Si user_id tiene NOT NULL, necesitamos hacerlo nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' 
    AND column_name = 'user_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE trainers ALTER COLUMN user_id DROP NOT NULL;
    RAISE NOTICE 'Made user_id nullable in trainers table';
  END IF;
  
  -- Si existe constraint UNIQUE en user_id, necesitamos hacerlo parcial (solo para NOT NULL)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trainers_user_id_unique' 
    AND contype = 'u'
  ) THEN
    ALTER TABLE trainers DROP CONSTRAINT IF EXISTS trainers_user_id_unique;
    -- Crear constraint único solo para user_id NOT NULL
    CREATE UNIQUE INDEX IF NOT EXISTS trainers_user_id_unique_idx 
    ON trainers(user_id) WHERE user_id IS NOT NULL;
    RAISE NOTICE 'Updated user_id unique constraint to allow NULL';
  END IF;
END $$;

DO $$
DECLARE
  jey_user_id UUID;
  jey_trainer_id UUID;
BEGIN
  -- 1. Obtener user_id de jeylabbb@gmail.com
  SELECT id INTO jey_user_id
  FROM auth.users
  WHERE email = 'jeylabbb@gmail.com';
  
  IF jey_user_id IS NULL THEN
    RAISE EXCEPTION 'User jeylabbb@gmail.com not found!';
  END IF;
  
  -- 2. Verificar si existe un trainer con slug 'jey'
  SELECT id INTO jey_trainer_id
  FROM trainers
  WHERE slug = 'jey';
  
  -- 3. Si no existe o no tiene el user_id correcto, crear/actualizar el trainer Jey
  IF jey_trainer_id IS NULL THEN
    INSERT INTO trainers (
      user_id,
      slug,
      trainer_name,
      email,
      is_active,
      visibility_status
    ) VALUES (
      jey_user_id,
      'jey',
      'Jey',
      'jeylabbb@gmail.com',
      true,
      'PUBLIC'
    )
    ON CONFLICT (slug) DO UPDATE
    SET user_id = jey_user_id,
        email = 'jeylabbb@gmail.com',
        is_active = true,
        visibility_status = 'PUBLIC';
    
    RAISE NOTICE 'Created/updated trainer Jey for jeylabbb@gmail.com';
  ELSE
    -- Actualizar el trainer existente para asegurar que tiene el user_id correcto
    UPDATE trainers
    SET user_id = jey_user_id,
        email = 'jeylabbb@gmail.com',
        is_active = true,
        visibility_status = 'PUBLIC'
    WHERE slug = 'jey';
    RAISE NOTICE 'Updated trainer Jey with jeylabbb@gmail.com user_id';
  END IF;
  
  -- 4. Crear o actualizar el entrenador Edu (sin user_id, entrenador del sistema)
  INSERT INTO trainers (
    user_id,
    slug,
    trainer_name,
    is_active,
    visibility_status
  ) VALUES (
    NULL, -- Sin user_id, es entrenador del sistema
    'edu',
    'Edu',
    true,
    'PUBLIC'
  )
  ON CONFLICT (slug) DO UPDATE
  SET user_id = NULL, -- Asegurar que no tiene user_id
      is_active = true,
      visibility_status = 'PUBLIC';
  
  RAISE NOTICE 'Created/updated trainer Edu (system trainer, no user_id)';
  
  -- 5. Asegurar que Carolina también existe (sin user_id)
  INSERT INTO trainers (
    user_id,
    slug,
    trainer_name,
    is_active,
    visibility_status
  ) VALUES (
    NULL, -- Sin user_id, es entrenador del sistema
    'carolina',
    'Carolina',
    true,
    'PUBLIC'
  )
  ON CONFLICT (slug) DO UPDATE
  SET user_id = NULL, -- Asegurar que no tiene user_id
      is_active = true,
      visibility_status = 'PUBLIC';
  
  RAISE NOTICE 'Created/updated trainer Carolina (system trainer, no user_id)';
  
END $$;

-- Verificar resultado
SELECT 
  id,
  slug,
  trainer_name,
  user_id,
  email,
  is_active,
  visibility_status
FROM trainers
WHERE slug IN ('jey', 'edu', 'carolina')
ORDER BY slug;
