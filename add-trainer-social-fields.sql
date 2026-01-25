-- Añadir campos de redes sociales y foto de perfil para entrenadores
-- Run this in your Supabase SQL Editor

DO $$ 
BEGIN
  -- Añadir campo de Instagram (link completo)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'instagram_url') THEN
    ALTER TABLE trainers ADD COLUMN instagram_url TEXT;
  END IF;

  -- Añadir campo de web/website
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'website_url') THEN
    ALTER TABLE trainers ADD COLUMN website_url TEXT;
  END IF;

  -- Añadir campo de YouTube
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'youtube_url') THEN
    ALTER TABLE trainers ADD COLUMN youtube_url TEXT;
  END IF;

  -- Añadir campo de TikTok
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'tiktok_url') THEN
    ALTER TABLE trainers ADD COLUMN tiktok_url TEXT;
  END IF;

  -- Añadir campo de Twitter/X
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'twitter_url') THEN
    ALTER TABLE trainers ADD COLUMN twitter_url TEXT;
  END IF;

  -- Asegurar que avatar_url existe (ya debería existir, pero por si acaso)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'avatar_url') THEN
    ALTER TABLE trainers ADD COLUMN avatar_url TEXT;
  END IF;

  RAISE NOTICE 'Campos de redes sociales añadidos correctamente';
END $$;

