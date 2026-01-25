-- Tablas para el sistema RAG (Retrieval-Augmented Generation)
-- Permite que la IA del entrenador busque y use solo el material subido

-- Tabla principal: Biblioteca de contenido del entrenador
CREATE TABLE IF NOT EXISTS trainer_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  
  -- Tipo de contenido
  content_type TEXT NOT NULL CHECK (content_type IN (
    'workout', 
    'diet', 
    'document', 
    'video_transcript',
    'pdf_text'
  )),
  
  -- Referencia al contenido original (si viene de otra tabla)
  source_id UUID, -- FK a trainer_workouts.id o trainer_diets.id
  
  -- Contenido procesado para RAG
  raw_content TEXT NOT NULL,           -- Texto completo para búsqueda
  structured_data JSONB,               -- Datos estructurados (workout_data, diet_data)
  
  -- Embeddings para búsqueda semántica (opcional, requiere pgvector)
  -- embedding VECTOR(1536),           -- OpenAI embedding (descomentar si usas pgvector)
  
  -- Metadata para filtrado
  tags TEXT[],                         -- ['ganar_musculo', 'fuerza', 'principiante']
  target_goals TEXT[],                 -- Objetivos para los que aplica
  intensity_level INTEGER,             -- 1-10
  experience_level TEXT,                -- 'principiante' | 'intermedio' | 'avanzado'
  
  -- Chunking (si el contenido es largo)
  chunk_index INTEGER DEFAULT 0,       -- Si el contenido está dividido en chunks
  total_chunks INTEGER DEFAULT 1,      -- Total de chunks de este contenido
  
  -- Versionado
  version INTEGER DEFAULT 1,
  parent_version_id UUID,              -- Si es actualización de otro contenido
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_trainer_content_library_trainer 
  ON trainer_content_library(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_content_library_type 
  ON trainer_content_library(content_type);
CREATE INDEX IF NOT EXISTS idx_trainer_content_library_tags 
  ON trainer_content_library USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_trainer_content_library_goals 
  ON trainer_content_library USING GIN(target_goals);
CREATE INDEX IF NOT EXISTS idx_trainer_content_library_active 
  ON trainer_content_library(trainer_id, is_active) WHERE is_active = true;

-- Índice para búsqueda de texto completo (full-text search)
CREATE INDEX IF NOT EXISTS idx_trainer_content_library_text_search 
  ON trainer_content_library USING GIN(to_tsvector('spanish', raw_content));

-- Tabla: Logs de uso de contenido (para analytics del entrenador)
CREATE TABLE IF NOT EXISTS trainer_content_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES trainer_content_library(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  
  -- Contexto de uso
  query TEXT,                          -- Qué preguntó el usuario
  response_type TEXT,                  -- 'workout' | 'diet' | 'general'
  was_helpful BOOLEAN,                 -- Si el usuario marcó como útil (opcional)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_usage_trainer 
  ON trainer_content_usage_logs(trainer_id);
CREATE INDEX IF NOT EXISTS idx_content_usage_content 
  ON trainer_content_usage_logs(content_id);
CREATE INDEX IF NOT EXISTS idx_content_usage_date 
  ON trainer_content_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_content_usage_user 
  ON trainer_content_usage_logs(user_id);

-- RLS Policies
ALTER TABLE trainer_content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_content_usage_logs ENABLE ROW LEVEL SECURITY;

-- Política: Los entrenadores pueden ver su propio contenido
CREATE POLICY "Trainers can view their own content"
  ON trainer_content_library
  FOR SELECT
  USING (
    trainer_id IN (
      -- Nota: La tabla trainers actualmente no tiene user_id asociado.
      -- Por ahora, permitimos que cualquier entrenador autenticado vea contenido de cualquier entrenador.
      -- Más adelante se puede refinar cuando exista el vínculo trainers -> auth.users.
      SELECT id FROM trainers
    )
  );

-- Política: Los entrenadores pueden insertar/actualizar su propio contenido
CREATE POLICY "Trainers can manage their own content"
  ON trainer_content_library
  FOR ALL
  USING (
    trainer_id IN (
      -- Igual que arriba: de momento no filtramos por user_id porque no existe en trainers.
      SELECT id FROM trainers
    )
  );

-- Política: Los usuarios pueden ver contenido de entrenadores activos
CREATE POLICY "Users can view active trainer content"
  ON trainer_content_library
  FOR SELECT
  USING (
    is_active = true AND
    trainer_id IN (
      SELECT id FROM trainers WHERE is_active = true
    )
  );

-- Política: Los entrenadores pueden ver sus propios logs
CREATE POLICY "Trainers can view their own usage logs"
  ON trainer_content_usage_logs
  FOR SELECT
  USING (
    trainer_id IN (
      -- De momento permitimos ver los logs de cualquier entrenador.
      -- Esto se puede endurecer cuando haya relación trainers -> auth.users.
      SELECT id FROM trainers
    )
  );

-- Política: Sistema puede insertar logs (service role)
-- Nota: Esto se maneja con service role key en el código

-- Función para indexar contenido automáticamente cuando se crea/actualiza workout o diet
-- (Se puede llamar desde triggers o desde el código)

COMMENT ON TABLE trainer_content_library IS 'Biblioteca de contenido del entrenador para sistema RAG. Permite búsqueda semántica del material.';
COMMENT ON TABLE trainer_content_usage_logs IS 'Logs de uso de contenido para analytics del entrenador.';

