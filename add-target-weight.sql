-- Add target weight (peso objetivo) to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC(5,2);

COMMENT ON COLUMN user_profiles.target_weight_kg IS 'Peso objetivo del usuario para mostrar en la gráfica y felicitar cuando lo alcance';
