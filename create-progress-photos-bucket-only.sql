-- Script rápido para crear SOLO el bucket progress-photos
-- Copia y pega esto en el SQL Editor de Supabase

-- Crear el bucket progress-photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de seguridad para progress-photos
DROP POLICY IF EXISTS "Users can upload their own progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Progress photos are publicly viewable" ON storage.objects;

CREATE POLICY "Users can upload their own progress photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own progress photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own progress photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Progress photos are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'progress-photos');


