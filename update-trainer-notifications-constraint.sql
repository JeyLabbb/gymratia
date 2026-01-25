-- Actualizar constraint de trainer_notifications para incluir 'jey'
-- Run this in your Supabase SQL Editor

-- Actualizar constraint en trainer_notifications
ALTER TABLE trainer_notifications 
DROP CONSTRAINT IF EXISTS trainer_notifications_trainer_slug_check;

ALTER TABLE trainer_notifications 
ADD CONSTRAINT trainer_notifications_trainer_slug_check 
CHECK (trainer_slug IN ('edu', 'carolina', 'jey'));

-- Verificar que el constraint se aplicó correctamente
SELECT 
  tc.table_name,
  cc.constraint_name,
  cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc 
  ON cc.constraint_name = tc.constraint_name
WHERE cc.constraint_name = 'trainer_notifications_trainer_slug_check';
