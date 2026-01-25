-- Tabla para solicitudes de acceso a entrenadores
-- Run this in your Supabase SQL Editor

-- Crear tabla de solicitudes de acceso
CREATE TABLE IF NOT EXISTS trainer_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, trainer_id, status) -- Un usuario solo puede tener una solicitud pendiente por entrenador
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_trainer_access_requests_user_id ON trainer_access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_access_requests_trainer_id ON trainer_access_requests(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_access_requests_status ON trainer_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_trainer_access_requests_created_at ON trainer_access_requests(created_at);

-- Habilitar RLS
ALTER TABLE trainer_access_requests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Los usuarios pueden ver sus propias solicitudes
DROP POLICY IF EXISTS "Users can view their own requests" ON trainer_access_requests;
CREATE POLICY "Users can view their own requests"
  ON trainer_access_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Los entrenadores pueden ver las solicitudes dirigidas a ellos
DROP POLICY IF EXISTS "Trainers can view requests for their profile" ON trainer_access_requests;
CREATE POLICY "Trainers can view requests for their profile"
  ON trainer_access_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainers
      WHERE trainers.id = trainer_access_requests.trainer_id
      AND trainers.user_id = auth.uid()
    )
  );

-- Los usuarios pueden crear sus propias solicitudes
DROP POLICY IF EXISTS "Users can create their own requests" ON trainer_access_requests;
CREATE POLICY "Users can create their own requests"
  ON trainer_access_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Los entrenadores pueden actualizar solicitudes dirigidas a ellos
DROP POLICY IF EXISTS "Trainers can update requests for their profile" ON trainer_access_requests;
CREATE POLICY "Trainers can update requests for their profile"
  ON trainer_access_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainers
      WHERE trainers.id = trainer_access_requests.trainer_id
      AND trainers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainers
      WHERE trainers.id = trainer_access_requests.trainer_id
      AND trainers.user_id = auth.uid()
    )
  );

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_trainer_access_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status != OLD.status THEN
    NEW.reviewed_at = NOW();
    NEW.reviewed_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_update_trainer_access_requests_updated_at ON trainer_access_requests;
CREATE TRIGGER trigger_update_trainer_access_requests_updated_at
  BEFORE UPDATE ON trainer_access_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_trainer_access_requests_updated_at();

-- Función para crear chat automáticamente cuando se aprueba una solicitud
CREATE OR REPLACE FUNCTION create_chat_on_access_approved()
RETURNS TRIGGER AS $$
DECLARE
  trainer_slug_value TEXT;
BEGIN
  -- Solo procesar si el status cambió a 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Obtener el slug del entrenador
    SELECT slug INTO trainer_slug_value
    FROM trainers
    WHERE id = NEW.trainer_id;
    
    -- Crear chat si no existe
    INSERT INTO trainer_chats (user_id, trainer_slug)
    VALUES (NEW.user_id, trainer_slug_value)
    ON CONFLICT (user_id, trainer_slug) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear chat cuando se aprueba
DROP TRIGGER IF EXISTS trigger_create_chat_on_access_approved ON trainer_access_requests;
CREATE TRIGGER trigger_create_chat_on_access_approved
  AFTER UPDATE ON trainer_access_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved'))
  EXECUTE FUNCTION create_chat_on_access_approved();
