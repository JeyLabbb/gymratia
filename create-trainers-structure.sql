-- Estructura de base de datos para entrenadores (trainers)
-- Run this in your Supabase SQL Editor

-- Tabla principal de entrenadores
CREATE TABLE IF NOT EXISTS trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  slug TEXT NOT NULL UNIQUE, -- slug único del entrenador (ej: 'jey', 'carlos-fitness')
  trainer_name TEXT NOT NULL, -- Nombre como entrenador
  full_name TEXT, -- Nombre completo del usuario
  email TEXT,
  avatar_url TEXT,
  
  -- Información del entrenador
  specialty TEXT, -- Especialidad/estilo
  description TEXT, -- Descripción breve
  philosophy TEXT, -- Filosofía de entrenamiento
  experience_years TEXT, -- Años de experiencia
  
  -- Configuración de privacidad
  privacy_mode TEXT NOT NULL DEFAULT 'public' CHECK (privacy_mode IN ('public', 'private', 'request')),
  activation_link TEXT, -- Link único para activación (si es privado)
  activation_code TEXT, -- Código para activación (si es privado)
  
  -- Estado y validación
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false, -- Si tiene certificados verificados
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  
  -- Métricas (para ranking)
  total_students INTEGER DEFAULT 0,
  active_students INTEGER DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Añadir TODAS las columnas faltantes si la tabla ya existe
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trainers') THEN
    -- Añadir user_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'user_id') THEN
      ALTER TABLE trainers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
      IF (SELECT COUNT(*) FROM trainers WHERE user_id IS NOT NULL) = 0 THEN
        ALTER TABLE trainers ADD CONSTRAINT trainers_user_id_unique UNIQUE (user_id);
      END IF;
    END IF;
    
    -- Añadir slug si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'slug') THEN
      ALTER TABLE trainers ADD COLUMN slug TEXT NOT NULL DEFAULT '';
    END IF;
    
    -- Añadir trainer_name si no existe, o renombrar "name" si existe
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'trainers' AND column_name = 'name' AND table_schema = 'public'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'trainers' AND column_name = 'trainer_name' AND table_schema = 'public'
    ) THEN
      -- Renombrar "name" a "trainer_name"
      ALTER TABLE trainers RENAME COLUMN name TO trainer_name;
    ELSIF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'trainers' AND column_name = 'trainer_name' AND table_schema = 'public'
    ) THEN
      -- Añadir trainer_name si no existe
      ALTER TABLE trainers ADD COLUMN trainer_name TEXT NOT NULL DEFAULT '';
    END IF;
    
    -- Añadir full_name si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'full_name') THEN
      ALTER TABLE trainers ADD COLUMN full_name TEXT;
    END IF;
    
    -- Añadir email si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'email') THEN
      ALTER TABLE trainers ADD COLUMN email TEXT;
    END IF;
    
    -- Añadir avatar_url si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'avatar_url') THEN
      ALTER TABLE trainers ADD COLUMN avatar_url TEXT;
    END IF;
    
    -- Añadir specialty si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'specialty') THEN
      ALTER TABLE trainers ADD COLUMN specialty TEXT;
    END IF;
    
    -- Añadir description si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'description') THEN
      ALTER TABLE trainers ADD COLUMN description TEXT;
    END IF;
    
    -- Añadir philosophy si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'philosophy') THEN
      ALTER TABLE trainers ADD COLUMN philosophy TEXT;
    END IF;
    
    -- Añadir experience_years si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'experience_years') THEN
      ALTER TABLE trainers ADD COLUMN experience_years TEXT;
    END IF;
    
    -- Añadir privacy_mode si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'privacy_mode') THEN
      ALTER TABLE trainers ADD COLUMN privacy_mode TEXT NOT NULL DEFAULT 'public';
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trainers_privacy_mode_check') THEN
        ALTER TABLE trainers ADD CONSTRAINT trainers_privacy_mode_check CHECK (privacy_mode IN ('public', 'private', 'request'));
      END IF;
    END IF;
    
    -- Añadir activation_link si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'activation_link') THEN
      ALTER TABLE trainers ADD COLUMN activation_link TEXT;
    END IF;
    
    -- Añadir activation_code si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'activation_code') THEN
      ALTER TABLE trainers ADD COLUMN activation_code TEXT;
    END IF;
    
    -- Añadir is_active si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'is_active') THEN
      ALTER TABLE trainers ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Añadir is_verified si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'is_verified') THEN
      ALTER TABLE trainers ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;
    
    -- Añadir verification_status si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'verification_status') THEN
      ALTER TABLE trainers ADD COLUMN verification_status TEXT DEFAULT 'pending';
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trainers_verification_status_check') THEN
        ALTER TABLE trainers ADD CONSTRAINT trainers_verification_status_check CHECK (verification_status IN ('pending', 'approved', 'rejected'));
      END IF;
    END IF;
    
    -- Añadir total_students si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'total_students') THEN
      ALTER TABLE trainers ADD COLUMN total_students INTEGER DEFAULT 0;
    END IF;
    
    -- Añadir active_students si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'active_students') THEN
      ALTER TABLE trainers ADD COLUMN active_students INTEGER DEFAULT 0;
    END IF;
    
    -- Añadir total_ratings si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'total_ratings') THEN
      ALTER TABLE trainers ADD COLUMN total_ratings INTEGER DEFAULT 0;
    END IF;
    
    -- Añadir average_rating si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'average_rating') THEN
      ALTER TABLE trainers ADD COLUMN average_rating NUMERIC(3,2) DEFAULT 0;
    END IF;
    
    -- Añadir created_at si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'created_at') THEN
      ALTER TABLE trainers ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Añadir updated_at si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'updated_at') THEN
      ALTER TABLE trainers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
  END IF;
END $$;

-- Tabla de certificados/títulos del entrenador
CREATE TABLE IF NOT EXISTS trainer_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  certificate_name TEXT NOT NULL, -- Nombre del certificado/título
  issuing_organization TEXT, -- Organización que lo emitió
  issue_date DATE,
  expiry_date DATE,
  certificate_file_url TEXT, -- URL del archivo en storage
  certificate_file_name TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verified_by UUID REFERENCES auth.users(id), -- Admin que verificó
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de contenido de entrenadores (workouts y diets que crean)
CREATE TABLE IF NOT EXISTS trainer_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  trainer_slug TEXT NOT NULL, -- Para compatibilidad con código existente
  title TEXT NOT NULL,
  description TEXT,
  workout_data JSONB NOT NULL,
  target_goals TEXT[], -- ['ganar_musculo', 'fuerza', etc.]
  intensity_level INTEGER, -- 1-10
  experience_level TEXT, -- 'principiante' | 'intermedio' | 'avanzado'
  tags TEXT[],
  is_template BOOLEAN DEFAULT true, -- Si es plantilla reutilizable
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trainer_diets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  trainer_slug TEXT NOT NULL, -- Para compatibilidad
  title TEXT NOT NULL,
  description TEXT,
  daily_calories NUMERIC(6,2),
  daily_protein_g NUMERIC(6,2),
  daily_carbs_g NUMERIC(6,2),
  daily_fats_g NUMERIC(6,2),
  diet_data JSONB NOT NULL,
  target_goals TEXT[],
  tags TEXT[],
  is_template BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de relaciones entrenador-alumno
CREATE TABLE IF NOT EXISTS trainer_student_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'rejected')),
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_by TEXT, -- 'link' | 'code' | 'request' | 'public'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trainer_id, student_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_trainers_user_id ON trainers(user_id);
CREATE INDEX IF NOT EXISTS idx_trainers_slug ON trainers(slug);
CREATE INDEX IF NOT EXISTS idx_trainers_privacy_mode ON trainers(privacy_mode);
CREATE INDEX IF NOT EXISTS idx_trainers_is_active ON trainers(is_active);
CREATE INDEX IF NOT EXISTS idx_trainer_certificates_trainer_id ON trainer_certificates(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_workouts_trainer_id ON trainer_workouts(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_diets_trainer_id ON trainer_diets(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_student_relationships_trainer_id ON trainer_student_relationships(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_student_relationships_student_id ON trainer_student_relationships(student_id);

-- Verificar y añadir columna user_id si falta (antes de crear políticas)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trainers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'user_id') THEN
      -- Añadir columna user_id
      ALTER TABLE trainers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
      
      -- Añadir constraint UNIQUE solo si no hay datos o todos los user_id son NULL
      IF (SELECT COUNT(*) FROM trainers WHERE user_id IS NOT NULL) = 0 THEN
        ALTER TABLE trainers ADD CONSTRAINT trainers_user_id_unique UNIQUE (user_id);
      END IF;
      
      RAISE NOTICE 'Columna user_id añadida a la tabla trainers. Si hay datos existentes, necesitarás actualizarlos manualmente.';
    END IF;
  END IF;
END $$;

-- RLS Policies
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_diets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_student_relationships ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para evitar conflictos al re-ejecutar)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Trainers can view their own profile" ON trainers;
  DROP POLICY IF EXISTS "Trainers can update their own profile" ON trainers;
  DROP POLICY IF EXISTS "Trainers can insert their own profile" ON trainers;
  DROP POLICY IF EXISTS "Users can view public active trainers" ON trainers;
  DROP POLICY IF EXISTS "Trainers can manage their own certificates" ON trainer_certificates;
  DROP POLICY IF EXISTS "Trainers can manage their own workouts" ON trainer_workouts;
  DROP POLICY IF EXISTS "Users can view active trainer workouts" ON trainer_workouts;
  DROP POLICY IF EXISTS "Trainers can manage their own diets" ON trainer_diets;
  DROP POLICY IF EXISTS "Users can view active trainer diets" ON trainer_diets;
  DROP POLICY IF EXISTS "Users can view their own trainer relationships" ON trainer_student_relationships;
  DROP POLICY IF EXISTS "System can create trainer relationships" ON trainer_student_relationships;
EXCEPTION WHEN OTHERS THEN
  -- Ignorar errores si las políticas no existen
  NULL;
END $$;

-- Políticas para trainers
CREATE POLICY "Trainers can view their own profile"
  ON trainers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers can update their own profile"
  ON trainers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers can insert their own profile"
  ON trainers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuarios pueden ver entrenadores públicos y activos
CREATE POLICY "Users can view public active trainers"
  ON trainers FOR SELECT
  USING (
    is_active = true AND 
    (privacy_mode = 'public' OR auth.uid() = user_id)
  );

-- Políticas para certificados
CREATE POLICY "Trainers can manage their own certificates"
  ON trainer_certificates FOR ALL
  USING (
    trainer_id IN (SELECT id FROM trainers WHERE user_id = auth.uid())
  );

-- Políticas para contenido del entrenador
CREATE POLICY "Trainers can manage their own workouts"
  ON trainer_workouts FOR ALL
  USING (
    trainer_id IN (SELECT id FROM trainers WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view active trainer workouts"
  ON trainer_workouts FOR SELECT
  USING (
    is_active = true AND
    trainer_id IN (SELECT id FROM trainers WHERE is_active = true)
  );

CREATE POLICY "Trainers can manage their own diets"
  ON trainer_diets FOR ALL
  USING (
    trainer_id IN (SELECT id FROM trainers WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view active trainer diets"
  ON trainer_diets FOR SELECT
  USING (
    is_active = true AND
    trainer_id IN (SELECT id FROM trainers WHERE is_active = true)
  );

-- Políticas para relaciones
CREATE POLICY "Users can view their own trainer relationships"
  ON trainer_student_relationships FOR SELECT
  USING (
    auth.uid() = student_id OR 
    trainer_id IN (SELECT id FROM trainers WHERE user_id = auth.uid())
  );

CREATE POLICY "System can create trainer relationships"
  ON trainer_student_relationships FOR INSERT
  WITH CHECK (true);

-- Función para generar slug único
CREATE OR REPLACE FUNCTION generate_trainer_slug(trainer_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convertir nombre a slug (minúsculas, sin espacios, sin acentos)
  base_slug := lower(translate(
    regexp_replace(trim(trainer_name), '[^a-zA-Z0-9\s]', '', 'g'),
    'áéíóúÁÉÍÓÚñÑ',
    'aeiouAEIOUnN'
  ));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- Si está vacío, usar 'trainer'
  IF base_slug = '' THEN
    base_slug := 'trainer';
  END IF;
  
  final_slug := base_slug;
  
  -- Verificar si existe y añadir número si es necesario
  WHILE EXISTS (SELECT 1 FROM trainers WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Eliminar triggers existentes si existen (para evitar errores al re-ejecutar)
DROP TRIGGER IF EXISTS update_trainers_updated_at ON trainers;
DROP TRIGGER IF EXISTS update_trainer_certificates_updated_at ON trainer_certificates;
DROP TRIGGER IF EXISTS update_trainer_workouts_updated_at ON trainer_workouts;
DROP TRIGGER IF EXISTS update_trainer_diets_updated_at ON trainer_diets;
DROP TRIGGER IF EXISTS update_trainer_student_relationships_updated_at ON trainer_student_relationships;

-- Crear triggers
CREATE TRIGGER update_trainers_updated_at BEFORE UPDATE ON trainers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainer_certificates_updated_at BEFORE UPDATE ON trainer_certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainer_workouts_updated_at BEFORE UPDATE ON trainer_workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainer_diets_updated_at BEFORE UPDATE ON trainer_diets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainer_student_relationships_updated_at BEFORE UPDATE ON trainer_student_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE trainers IS 'Perfiles de entrenadores en la plataforma';
COMMENT ON TABLE trainer_certificates IS 'Certificados y títulos de los entrenadores';
COMMENT ON TABLE trainer_workouts IS 'Plantillas de entrenamientos creadas por entrenadores';
COMMENT ON TABLE trainer_diets IS 'Plantillas de dietas creadas por entrenadores';
COMMENT ON TABLE trainer_student_relationships IS 'Relaciones entre entrenadores y alumnos';

