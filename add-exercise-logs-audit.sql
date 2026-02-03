-- Add audit columns to exercise_logs
-- Run in Supabase SQL Editor

ALTER TABLE exercise_logs 
ADD COLUMN IF NOT EXISTS updated_by_role TEXT CHECK (updated_by_role IN ('student', 'coach')),
ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES auth.users(id);
