-- Actualizar constraints para aceptar 'jey' además de 'edu' y 'carolina'
-- Run this in your Supabase SQL Editor

-- Actualizar constraint en trainer_chats
ALTER TABLE trainer_chats 
DROP CONSTRAINT IF EXISTS trainer_chats_trainer_slug_check;

ALTER TABLE trainer_chats 
ADD CONSTRAINT trainer_chats_trainer_slug_check 
CHECK (trainer_slug IN ('edu', 'carolina', 'jey'));

-- Actualizar constraint en user_workouts
ALTER TABLE user_workouts 
DROP CONSTRAINT IF EXISTS user_workouts_trainer_slug_check;

ALTER TABLE user_workouts 
ADD CONSTRAINT user_workouts_trainer_slug_check 
CHECK (trainer_slug IN ('edu', 'carolina', 'jey'));

-- Actualizar constraint en user_diets
ALTER TABLE user_diets 
DROP CONSTRAINT IF EXISTS user_diets_trainer_slug_check;

ALTER TABLE user_diets 
ADD CONSTRAINT user_diets_trainer_slug_check 
CHECK (trainer_slug IN ('edu', 'carolina', 'jey'));

-- Actualizar constraint en meal_planners
ALTER TABLE meal_planners 
DROP CONSTRAINT IF EXISTS meal_planners_trainer_slug_check;

ALTER TABLE meal_planners 
ADD CONSTRAINT meal_planners_trainer_slug_check 
CHECK (trainer_slug IN ('edu', 'carolina', 'jey'));

-- Actualizar constraint en user_food_categories
ALTER TABLE user_food_categories 
DROP CONSTRAINT IF EXISTS user_food_categories_trainer_slug_check;

ALTER TABLE user_food_categories 
ADD CONSTRAINT user_food_categories_trainer_slug_check 
CHECK (trainer_slug IN ('edu', 'carolina', 'jey'));

-- Actualizar constraint en trainer_notifications
ALTER TABLE trainer_notifications 
DROP CONSTRAINT IF EXISTS trainer_notifications_trainer_slug_check;

ALTER TABLE trainer_notifications 
ADD CONSTRAINT trainer_notifications_trainer_slug_check 
CHECK (trainer_slug IN ('edu', 'carolina', 'jey'));

-- Verificar que las constraints se aplicaron correctamente
SELECT 
  tc.table_name,
  cc.constraint_name,
  cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc 
  ON cc.constraint_name = tc.constraint_name
WHERE cc.constraint_name LIKE '%trainer_slug%'
ORDER BY tc.table_name, cc.constraint_name;
