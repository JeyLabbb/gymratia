-- ============================================
-- Sistema de Visibilidad de Entrenadores
-- ============================================
-- Actualiza la tabla trainers con campos de visibilidad y revisión
-- Run this in Supabase SQL Editor

-- 1. Añadir campos de visibilidad y revisión a trainers
DO $$ 
BEGIN
  -- Añadir visibility_status si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' AND column_name = 'visibility_status'
  ) THEN
    ALTER TABLE trainers ADD COLUMN visibility_status TEXT NOT NULL DEFAULT 'DRAFT' 
      CHECK (visibility_status IN ('DRAFT', 'PRIVATE', 'PENDING_REVIEW', 'PUBLIC', 'REJECTED'));
  END IF;

  -- Añadir requested_at si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' AND column_name = 'requested_at'
  ) THEN
    ALTER TABLE trainers ADD COLUMN requested_at TIMESTAMPTZ;
  END IF;

  -- Añadir reviewed_at si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE trainers ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;

  -- Añadir admin_review_token si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' AND column_name = 'admin_review_token'
  ) THEN
    ALTER TABLE trainers ADD COLUMN admin_review_token TEXT;
  END IF;

  -- Añadir certificacion/titulo si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' AND column_name = 'certification'
  ) THEN
    ALTER TABLE trainers ADD COLUMN certification TEXT;
  END IF;

  -- Añadir social_handle si no existe (para IG/TikTok/X)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' AND column_name = 'social_handle'
  ) THEN
    ALTER TABLE trainers ADD COLUMN social_handle TEXT;
  END IF;

  -- Añadir social_proof si no existe (clientes satisfechos, links, etc)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainers' AND column_name = 'social_proof'
  ) THEN
    ALTER TABLE trainers ADD COLUMN social_proof TEXT;
  END IF;

  -- Crear índice para visibility_status
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_trainers_visibility_status'
  ) THEN
    CREATE INDEX idx_trainers_visibility_status ON trainers(visibility_status);
  END IF;

  -- Crear índice para admin_review_token
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_trainers_admin_review_token'
  ) THEN
    CREATE INDEX idx_trainers_admin_review_token ON trainers(admin_review_token);
  END IF;
END $$;

-- 2. Actualizar entrenadores existentes sin visibility_status a DRAFT
UPDATE trainers 
SET visibility_status = 'DRAFT' 
WHERE visibility_status IS NULL;

-- 3. Crear tabla de mensajes/notificaciones
CREATE TABLE IF NOT EXISTS user_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('trainer_review_approved', 'trainer_review_rejected', 'system', 'info')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para user_messages
CREATE INDEX IF NOT EXISTS idx_user_messages_user_id ON user_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_read_at ON user_messages(read_at);
CREATE INDEX IF NOT EXISTS idx_user_messages_created_at ON user_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_user_messages_type ON user_messages(type);

-- Habilitar RLS en user_messages
ALTER TABLE user_messages ENABLE ROW LEVEL SECURITY;

-- Política RLS: usuarios pueden ver sus propios mensajes
DROP POLICY IF EXISTS "Users can view their own messages" ON user_messages;
CREATE POLICY "Users can view their own messages"
  ON user_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Política RLS: usuarios pueden marcar sus mensajes como leídos
DROP POLICY IF EXISTS "Users can update their own messages" ON user_messages;
CREATE POLICY "Users can update their own messages"
  ON user_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política RLS: sistema puede insertar mensajes
DROP POLICY IF EXISTS "System can insert messages" ON user_messages;
CREATE POLICY "System can insert messages"
  ON user_messages FOR INSERT
  WITH CHECK (true);

-- Actualizar política de trainers para que solo PUBLIC aparezca en público
DROP POLICY IF EXISTS "Users can view public active trainers" ON trainers;
CREATE POLICY "Users can view public active trainers"
  ON trainers FOR SELECT
  USING (
    is_active = true AND 
    (
      visibility_status = 'PUBLIC' OR 
      auth.uid() = user_id OR
      -- Permitir acceso por link (si tiene activation_link y el usuario lo usa)
      (visibility_status IN ('DRAFT', 'PRIVATE') AND activation_link IS NOT NULL)
    )
  );

COMMENT ON COLUMN trainers.visibility_status IS 'Estado de visibilidad: DRAFT (borrador), PRIVATE (privado), PENDING_REVIEW (pendiente revisión), PUBLIC (público), REJECTED (rechazado)';
COMMENT ON COLUMN trainers.requested_at IS 'Fecha en que se solicitó hacerse público';
COMMENT ON COLUMN trainers.reviewed_at IS 'Fecha en que se revisó la solicitud';
COMMENT ON COLUMN trainers.admin_review_token IS 'Token único para revisión de admin (un solo uso)';
COMMENT ON TABLE user_messages IS 'Mensajes/notificaciones in-app para usuarios';

