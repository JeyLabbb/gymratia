-- Add user preferences for meal times and training schedule
-- Run this in your Supabase SQL Editor

-- Add columns to user_profiles for meal preferences
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS preferred_meal_times JSONB, -- e.g. {"breakfast": "08:00", "lunch": "14:00", "dinner": "20:00"}
ADD COLUMN IF NOT EXISTS training_schedule JSONB; -- e.g. {"days": ["lunes", "miércoles", "viernes"], "times": ["09:00", "19:00"]}

-- Add index for better queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_training_schedule ON user_profiles USING GIN (training_schedule);





