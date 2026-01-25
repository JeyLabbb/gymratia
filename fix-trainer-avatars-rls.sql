-- Fix RLS policies for trainer-avatars bucket
-- Run this in your Supabase SQL Editor

-- Asegurar que el bucket existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('trainer-avatars', 'trainer-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Trainers can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Trainers can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Trainers can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Trainer avatars are publicly viewable" ON storage.objects;

-- Política para INSERT: Solo entrenadores pueden subir avatares en su carpeta
CREATE POLICY "Trainers can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trainer-avatars' AND
  (
    -- El path debe empezar con el user_id del usuario autenticado
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- O verificar que el usuario tiene un perfil de entrenador
    EXISTS (
      SELECT 1 FROM trainers 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  )
);

-- Política para UPDATE: Solo pueden actualizar sus propios avatares
CREATE POLICY "Trainers can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'trainer-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'trainer-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para DELETE: Solo pueden eliminar sus propios avatares
CREATE POLICY "Trainers can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'trainer-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para SELECT: Los avatares son públicamente visibles
CREATE POLICY "Trainer avatars are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'trainer-avatars');

