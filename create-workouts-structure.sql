-- Create workouts and exercise tracking structure for GymRatIA
-- Run this in your Supabase SQL Editor

-- Table for active workouts (created by trainer or user)
CREATE TABLE IF NOT EXISTS user_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_slug TEXT NOT NULL CHECK (trainer_slug IN ('edu', 'carolina')),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  workout_data JSONB NOT NULL, -- Structure: { days: [{ day: "Lunes", exercises: [...] }] }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Table for exercise logs (tracking progress day by day)
CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES user_workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  date DATE NOT NULL,
  sets JSONB NOT NULL, -- Array of sets: [{ set_number: 1, reps: 10, weight_kg: 80, tempo: "2-0-1-0", rest_seconds: 90, notes: "" }]
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_workouts_user_id ON user_workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workouts_trainer_slug ON user_workouts(trainer_slug);
CREATE INDEX IF NOT EXISTS idx_user_workouts_is_active ON user_workouts(is_active);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_id ON exercise_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_workout_id ON exercise_logs(workout_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_date ON exercise_logs(date);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise_name ON exercise_logs(exercise_name);

-- Row Level Security (RLS) Policies
ALTER TABLE user_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_workouts
CREATE POLICY "Users can view their own workouts"
  ON user_workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workouts"
  ON user_workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts"
  ON user_workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts"
  ON user_workouts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for exercise_logs
CREATE POLICY "Users can view their own exercise logs"
  ON exercise_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise logs"
  ON exercise_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise logs"
  ON exercise_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise logs"
  ON exercise_logs FOR DELETE
  USING (auth.uid() = user_id);





