-- Supabase Database Schema for GymRatIA
-- Run this in your Supabase SQL Editor

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  height_cm INTEGER,
  weight_kg NUMERIC(5,2),
  goal TEXT,
  sex TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Trainer Chats Table
CREATE TABLE IF NOT EXISTS trainer_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_slug TEXT NOT NULL CHECK (trainer_slug IN ('edu', 'carolina')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  UNIQUE(user_id, trainer_slug)
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES trainer_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  public_profile BOOLEAN DEFAULT false,
  public_progress BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_chats_user_id ON trainer_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_chats_trainer_slug ON trainer_chats(trainer_slug);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Fix: Enable RLS on checkins table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checkins') THEN
    ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
    
    -- Add basic RLS policies for checkins if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'checkins' AND policyname = 'Users can view their own checkins'
    ) THEN
      CREATE POLICY "Users can view their own checkins"
        ON checkins FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'checkins' AND policyname = 'Users can insert their own checkins'
    ) THEN
      CREATE POLICY "Users can insert their own checkins"
        ON checkins FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'checkins' AND policyname = 'Users can update their own checkins'
    ) THEN
      CREATE POLICY "Users can update their own checkins"
        ON checkins FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- User Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trainer Chats Policies
CREATE POLICY "Users can view their own chats"
  ON trainer_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chats"
  ON trainer_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
  ON trainer_chats FOR UPDATE
  USING (auth.uid() = user_id);

-- Chat Messages Policies
CREATE POLICY "Users can view messages from their chats"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainer_chats
      WHERE trainer_chats.id = chat_messages.chat_id
      AND trainer_chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their chats"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainer_chats
      WHERE trainer_chats.id = chat_messages.chat_id
      AND trainer_chats.user_id = auth.uid()
    )
  );

-- User Preferences Policies
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainer_chats_updated_at BEFORE UPDATE ON trainer_chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

