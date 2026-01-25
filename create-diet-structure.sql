-- Create diet and meal planning structure for GymRatIA
-- Run this in your Supabase SQL Editor

-- Table for user diets (created by trainer)
CREATE TABLE IF NOT EXISTS user_diets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_slug TEXT NOT NULL CHECK (trainer_slug IN ('edu', 'carolina')),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  daily_calories NUMERIC(6,2),
  daily_protein_g NUMERIC(6,2),
  daily_carbs_g NUMERIC(6,2),
  daily_fats_g NUMERIC(6,2),
  diet_data JSONB, -- Full diet structure with meals, foods, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Table for meal planners (daily meal plans)
CREATE TABLE IF NOT EXISTS meal_planners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_slug TEXT NOT NULL CHECK (trainer_slug IN ('edu', 'carolina')),
  diet_id UUID REFERENCES user_diets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meals JSONB NOT NULL, -- Array of meals with foods, quantities, macros
  total_calories NUMERIC(6,2),
  total_protein_g NUMERIC(6,2),
  total_carbs_g NUMERIC(6,2),
  total_fats_g NUMERIC(6,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Table for allowed/controlled/prohibited foods per user
CREATE TABLE IF NOT EXISTS user_food_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_slug TEXT NOT NULL CHECK (trainer_slug IN ('edu', 'carolina')),
  food_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('allowed', 'controlled', 'prohibited')),
  quantity_per_serving NUMERIC(6,2), -- in grams
  calories_per_100g NUMERIC(6,2),
  protein_per_100g NUMERIC(6,2),
  carbs_per_100g NUMERIC(6,2),
  fats_per_100g NUMERIC(6,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_diets_user_id ON user_diets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_diets_trainer_slug ON user_diets(trainer_slug);
CREATE INDEX IF NOT EXISTS idx_user_diets_is_active ON user_diets(is_active);
CREATE INDEX IF NOT EXISTS idx_meal_planners_user_id ON meal_planners(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_planners_date ON meal_planners(date);
CREATE INDEX IF NOT EXISTS idx_meal_planners_diet_id ON meal_planners(diet_id);
CREATE INDEX IF NOT EXISTS idx_user_food_categories_user_id ON user_food_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_food_categories_category ON user_food_categories(category);

-- Enable RLS
ALTER TABLE user_diets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_food_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_diets
CREATE POLICY "Users can view their own diets"
  ON user_diets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own diets"
  ON user_diets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert diets"
  ON user_diets FOR INSERT
  WITH CHECK (true); -- Service role can insert

-- RLS Policies for meal_planners
CREATE POLICY "Users can view their own meal planners"
  ON meal_planners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal planners"
  ON meal_planners FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert meal planners"
  ON meal_planners FOR INSERT
  WITH CHECK (true); -- Service role can insert

-- RLS Policies for user_food_categories
CREATE POLICY "Users can view their own food categories"
  ON user_food_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own food categories"
  ON user_food_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own food categories"
  ON user_food_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food categories"
  ON user_food_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_diet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_diets_updated_at BEFORE UPDATE ON user_diets
  FOR EACH ROW EXECUTE FUNCTION update_diet_updated_at();

CREATE TRIGGER update_meal_planners_updated_at BEFORE UPDATE ON meal_planners
  FOR EACH ROW EXECUTE FUNCTION update_diet_updated_at();

CREATE TRIGGER update_user_food_categories_updated_at BEFORE UPDATE ON user_food_categories
  FOR EACH ROW EXECUTE FUNCTION update_diet_updated_at();





