-- Fix RLS for checkins table
-- Run this in Supabase SQL Editor if you get the RLS error

-- Enable RLS on checkins table
ALTER TABLE IF EXISTS checkins ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies for checkins
-- First, drop existing policies if they exist (optional, to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own checkins" ON checkins;
DROP POLICY IF EXISTS "Users can insert their own checkins" ON checkins;
DROP POLICY IF EXISTS "Users can update their own checkins" ON checkins;
DROP POLICY IF EXISTS "Users can delete their own checkins" ON checkins;

-- Create new policies
-- Note: Adjust these policies based on your checkins table structure
-- This assumes checkins has a user_id column

CREATE POLICY "Users can view their own checkins"
  ON checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checkins"
  ON checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checkins"
  ON checkins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checkins"
  ON checkins FOR DELETE
  USING (auth.uid() = user_id);


