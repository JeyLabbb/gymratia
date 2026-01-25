-- Asignar Jey a jeylabbb@gmail.com
-- Este script asigna el entrenador "Jey" a la cuenta jeylabbb@gmail.com
-- como si hubiera sido creado desde la app por ese usuario

-- Paso 1: Obtener el user_id de jeylabbb@gmail.com
-- (Nota: Si el usuario no existe, primero debe registrarse en la app)

-- Paso 2: Crear o actualizar el registro de entrenador para Jey
-- Esto asume que el slug 'jey' ya existe o se creará

DO $$
DECLARE
  v_user_id UUID;
  v_trainer_id UUID;
BEGIN
  -- Obtener el user_id del email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'jeylabbb@gmail.com';

  -- Si el usuario no existe, mostrar un error
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario con email jeylabbb@gmail.com no encontrado. Por favor, regístrate primero en la app.';
  END IF;

  -- Verificar si ya existe un entrenador con slug 'jey'
  SELECT id INTO v_trainer_id
  FROM trainers
  WHERE slug = 'jey';

  IF v_trainer_id IS NOT NULL THEN
    -- Actualizar el entrenador existente para asignarlo al usuario
    UPDATE trainers
    SET 
      user_id = v_user_id,
      trainer_name = 'Jey',
      full_name = COALESCE((SELECT full_name FROM user_profiles WHERE user_id = v_user_id), 'Jey'),
      email = 'jeylabbb@gmail.com',
      description = 'El más duro. Sin excusas. Alta intensidad.',
      philosophy = 'Sobrecarga progresiva, RIR 0-2, evita volumen basura.',
      specialty = 'Culturismo de élite',
      is_active = true,
      privacy_mode = 'public',
      updated_at = NOW()
    WHERE id = v_trainer_id;
    
    RAISE NOTICE 'Entrenador Jey actualizado y asignado a jeylabbb@gmail.com';
  ELSE
    -- Crear nuevo registro de entrenador
    INSERT INTO trainers (
      user_id,
      slug,
      trainer_name,
      full_name,
      email,
      description,
      philosophy,
      specialty,
      is_active,
      privacy_mode,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      'jey',
      'Jey',
      COALESCE((SELECT full_name FROM user_profiles WHERE user_id = v_user_id), 'Jey'),
      'jeylabbb@gmail.com',
      'El más duro. Sin excusas. Alta intensidad.',
      'Sobrecarga progresiva, RIR 0-2, evita volumen basura.',
      'Culturismo de élite',
      true,
      'public',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Entrenador Jey creado y asignado a jeylabbb@gmail.com';
  END IF;

  -- Asegurar que el perfil de usuario tenga el nombre correcto si no lo tiene
  UPDATE user_profiles
  SET 
    full_name = COALESCE(full_name, 'Jey'),
    updated_at = NOW()
  WHERE user_id = v_user_id
    AND (full_name IS NULL OR full_name = '');

END $$;

-- Verificar que se asignó correctamente
SELECT 
  t.id,
  t.slug,
  t.trainer_name,
  t.full_name,
  t.email,
  u.email as auth_email,
  t.is_active,
  t.privacy_mode
FROM trainers t
JOIN auth.users u ON t.user_id = u.id
WHERE u.email = 'jeylabbb@gmail.com' AND t.slug = 'jey';

