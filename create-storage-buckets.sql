-- Create storage buckets for GymRatIA
-- Run this in your Supabase SQL Editor

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create progress-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create posts bucket (for future use)
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Storage policies for progress-photos bucket
-- Drop existing policies if they exist to avoid conflicts
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

-- Storage policies for posts bucket
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own posts" ON storage.objects;
DROP POLICY IF EXISTS "Posts are publicly viewable" ON storage.objects;

CREATE POLICY "Users can upload their own posts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'posts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own posts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'posts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own posts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'posts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Posts are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'posts');

