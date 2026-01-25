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

-- Create trainer-certificates bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('trainer-certificates', 'trainer-certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Create trainer-avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('trainer-avatars', 'trainer-avatars', true)
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

-- Storage policies for trainer-avatars bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Trainers can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Trainers can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Trainers can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Trainer avatars are publicly viewable" ON storage.objects;

CREATE POLICY "Trainers can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trainer-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Trainers can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'trainer-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Trainers can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'trainer-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Trainer avatars are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'trainer-avatars');

-- Storage policies for trainer-certificates bucket
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Trainers can upload their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Trainers can update their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Trainers can delete their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Certificates are publicly viewable" ON storage.objects;

CREATE POLICY "Trainers can upload their own certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trainer-certificates' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Trainers can update their own certificates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'trainer-certificates' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Trainers can delete their own certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'trainer-certificates' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Certificates are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'trainer-certificates');

-- Storage policies for trainer-social-proof bucket
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Trainers can upload their own social proof files" ON storage.objects;
DROP POLICY IF EXISTS "Trainers can update their own social proof files" ON storage.objects;
DROP POLICY IF EXISTS "Trainers can delete their own social proof files" ON storage.objects;
DROP POLICY IF EXISTS "Social proof files are publicly viewable" ON storage.objects;

CREATE POLICY "Trainers can upload their own social proof files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trainer-social-proof' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Trainers can update their own social proof files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'trainer-social-proof' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Trainers can delete their own social proof files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'trainer-social-proof' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Social proof files are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'trainer-social-proof');

