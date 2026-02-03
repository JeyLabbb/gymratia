-- Add image_url to chat_messages for vision support
-- Run in Supabase SQL Editor
-- También ejecuta: create-chat-images-bucket.sql (para el bucket de imágenes)

ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS image_url TEXT;
