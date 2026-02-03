-- Create chat-images bucket for chat attachments
-- Run in Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated users can upload to their folder
DROP POLICY IF EXISTS "Users can upload chat images" ON storage.objects;
CREATE POLICY "Users can upload chat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: chat images are publicly viewable
DROP POLICY IF EXISTS "Chat images are publicly viewable" ON storage.objects;
CREATE POLICY "Chat images are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-images');
