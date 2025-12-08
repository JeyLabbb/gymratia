-- ============================================
-- Profile Changes and Notifications System
-- ============================================
-- Run this in Supabase SQL Editor
-- Make sure to run each section separately if you get errors

-- Step 1: Create profile_changes table
CREATE TABLE IF NOT EXISTS profile_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT false,
  trainer_notified_at TIMESTAMPTZ
);

-- Step 2: Create trainer_notifications table
CREATE TABLE IF NOT EXISTS trainer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_slug TEXT NOT NULL CHECK (trainer_slug IN ('edu', 'carolina')),
  chat_id UUID REFERENCES trainer_chats(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('profile_change', 'progress_update', 'photo_upload')),
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_profile_changes_user_id ON profile_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_changes_created_at ON profile_changes(created_at);
CREATE INDEX IF NOT EXISTS idx_trainer_notifications_user_id ON trainer_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notifications_trainer_slug ON trainer_notifications(trainer_slug);
CREATE INDEX IF NOT EXISTS idx_trainer_notifications_read ON trainer_notifications(read);
CREATE INDEX IF NOT EXISTS idx_trainer_notifications_created_at ON trainer_notifications(created_at);

-- Step 4: Enable RLS
ALTER TABLE profile_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_notifications ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile changes" ON profile_changes;
DROP POLICY IF EXISTS "System can insert profile changes" ON profile_changes;
DROP POLICY IF EXISTS "Users can view their own notifications" ON trainer_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON trainer_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON trainer_notifications;

-- Step 6: Create RLS Policies for profile_changes
CREATE POLICY "Users can view their own profile changes"
  ON profile_changes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert profile changes"
  ON profile_changes FOR INSERT
  WITH CHECK (true);

-- Step 7: Create RLS Policies for trainer_notifications
CREATE POLICY "Users can view their own notifications"
  ON trainer_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON trainer_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON trainer_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Step 8: Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS profile_change_notification_trigger ON user_profiles;
DROP FUNCTION IF EXISTS notify_trainer_profile_change();

-- Step 9: Create function to notify trainers of profile changes
CREATE OR REPLACE FUNCTION notify_trainer_profile_change()
RETURNS TRIGGER AS $$
DECLARE
  trainer_record RECORD;
  notification_message TEXT;
  field_changed TEXT;
BEGIN
  -- Determine which field changed
  IF OLD.height_cm IS DISTINCT FROM NEW.height_cm THEN
    field_changed := 'height_cm';
    notification_message := 'El usuario ha actualizado su altura de ' || COALESCE(OLD.height_cm::TEXT, 'N/A') || ' cm a ' || COALESCE(NEW.height_cm::TEXT, 'N/A') || ' cm.';
  ELSIF OLD.weight_kg IS DISTINCT FROM NEW.weight_kg THEN
    field_changed := 'weight_kg';
    notification_message := 'El usuario ha actualizado su peso de ' || COALESCE(OLD.weight_kg::TEXT, 'N/A') || ' kg a ' || COALESCE(NEW.weight_kg::TEXT, 'N/A') || ' kg.';
  ELSIF OLD.goal IS DISTINCT FROM NEW.goal THEN
    field_changed := 'goal';
    notification_message := 'El usuario ha cambiado su objetivo de "' || COALESCE(OLD.goal, 'N/A') || '" a "' || COALESCE(NEW.goal, 'N/A') || '".';
  ELSIF OLD.sex IS DISTINCT FROM NEW.sex THEN
    field_changed := 'sex';
    notification_message := 'El usuario ha actualizado su información de sexo.';
  ELSIF OLD.preferred_name IS DISTINCT FROM NEW.preferred_name THEN
    field_changed := 'preferred_name';
    notification_message := 'El usuario prefiere que le llames "' || COALESCE(NEW.preferred_name, 'N/A') || '" ahora.';
  ELSE
    -- No significant change, exit
    RETURN NEW;
  END IF;

  -- Log the change
  INSERT INTO profile_changes (user_id, field_name, old_value, new_value)
  VALUES (
    NEW.user_id,
    field_changed,
    CASE field_changed
      WHEN 'height_cm' THEN OLD.height_cm::TEXT
      WHEN 'weight_kg' THEN OLD.weight_kg::TEXT
      WHEN 'goal' THEN OLD.goal
      WHEN 'sex' THEN OLD.sex
      WHEN 'preferred_name' THEN OLD.preferred_name
    END,
    CASE field_changed
      WHEN 'height_cm' THEN NEW.height_cm::TEXT
      WHEN 'weight_kg' THEN NEW.weight_kg::TEXT
      WHEN 'goal' THEN NEW.goal
      WHEN 'sex' THEN NEW.sex
      WHEN 'preferred_name' THEN NEW.preferred_name
    END
  );

  -- Create notifications for all active trainer chats
  FOR trainer_record IN 
    SELECT DISTINCT trainer_slug, id as chat_id 
    FROM trainer_chats 
    WHERE user_id = NEW.user_id
  LOOP
    INSERT INTO trainer_notifications (
      user_id,
      trainer_slug,
      chat_id,
      notification_type,
      message,
      data
    ) VALUES (
      NEW.user_id,
      trainer_record.trainer_slug,
      trainer_record.chat_id,
      'profile_change',
      notification_message,
      jsonb_build_object(
        'field', field_changed,
        'old_value', CASE field_changed
          WHEN 'height_cm' THEN OLD.height_cm
          WHEN 'weight_kg' THEN OLD.weight_kg
          WHEN 'goal' THEN OLD.goal
          WHEN 'sex' THEN OLD.sex
          WHEN 'preferred_name' THEN OLD.preferred_name
        END,
        'new_value', CASE field_changed
          WHEN 'height_cm' THEN NEW.height_cm
          WHEN 'weight_kg' THEN NEW.weight_kg
          WHEN 'goal' THEN NEW.goal
          WHEN 'sex' THEN NEW.sex
          WHEN 'preferred_name' THEN NEW.preferred_name
        END
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create trigger
CREATE TRIGGER profile_change_notification_trigger
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_trainer_profile_change();


