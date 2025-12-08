-- Table to track profile changes and notify trainers
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

-- Table for trainer notifications about profile changes
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profile_changes_user_id ON profile_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_changes_created_at ON profile_changes(created_at);
CREATE INDEX IF NOT EXISTS idx_trainer_notifications_user_id ON trainer_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notifications_trainer_slug ON trainer_notifications(trainer_slug);
CREATE INDEX IF NOT EXISTS idx_trainer_notifications_read ON trainer_notifications(read);
CREATE INDEX IF NOT EXISTS idx_trainer_notifications_created_at ON trainer_notifications(created_at);

-- Enable RLS
ALTER TABLE profile_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_changes
CREATE POLICY "Users can view their own profile changes"
  ON profile_changes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert profile changes"
  ON profile_changes FOR INSERT
  WITH CHECK (true);

-- RLS Policies for trainer_notifications
CREATE POLICY "Users can view their own notifications"
  ON trainer_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON trainer_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON trainer_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to create notification when profile changes
CREATE OR REPLACE FUNCTION notify_trainer_profile_change()
RETURNS TRIGGER AS $$
DECLARE
  change_record RECORD;
  trainer_record RECORD;
  notification_message TEXT;
BEGIN
  -- Only process if a significant field changed
  IF (OLD.height_cm IS DISTINCT FROM NEW.height_cm) OR
     (OLD.weight_kg IS DISTINCT FROM NEW.weight_kg) OR
     (OLD.goal IS DISTINCT FROM NEW.goal) OR
     (OLD.sex IS DISTINCT FROM NEW.sex) OR
     (OLD.preferred_name IS DISTINCT FROM NEW.preferred_name) THEN
    
    -- Log the change
    INSERT INTO profile_changes (user_id, field_name, old_value, new_value)
    VALUES (
      NEW.user_id,
      CASE 
        WHEN OLD.height_cm IS DISTINCT FROM NEW.height_cm THEN 'height_cm'
        WHEN OLD.weight_kg IS DISTINCT FROM NEW.weight_kg THEN 'weight_kg'
        WHEN OLD.goal IS DISTINCT FROM NEW.goal THEN 'goal'
        WHEN OLD.sex IS DISTINCT FROM NEW.sex THEN 'sex'
        WHEN OLD.preferred_name IS DISTINCT FROM NEW.preferred_name THEN 'preferred_name'
      END,
      CASE 
        WHEN OLD.height_cm IS DISTINCT FROM NEW.height_cm THEN OLD.height_cm::TEXT
        WHEN OLD.weight_kg IS DISTINCT FROM NEW.weight_kg THEN OLD.weight_kg::TEXT
        WHEN OLD.goal IS DISTINCT FROM NEW.goal THEN OLD.goal
        WHEN OLD.sex IS DISTINCT FROM NEW.sex THEN OLD.sex
        WHEN OLD.preferred_name IS DISTINCT FROM NEW.preferred_name THEN OLD.preferred_name
      END,
      CASE 
        WHEN OLD.height_cm IS DISTINCT FROM NEW.height_cm THEN NEW.height_cm::TEXT
        WHEN OLD.weight_kg IS DISTINCT FROM NEW.weight_kg THEN NEW.weight_kg::TEXT
        WHEN OLD.goal IS DISTINCT FROM NEW.goal THEN NEW.goal
        WHEN OLD.sex IS DISTINCT FROM NEW.sex THEN NEW.sex
        WHEN OLD.preferred_name IS DISTINCT FROM NEW.preferred_name THEN NEW.preferred_name
      END
    );

    -- Create notifications for all active trainer chats
    FOR trainer_record IN 
      SELECT DISTINCT trainer_slug, id as chat_id 
      FROM trainer_chats 
      WHERE user_id = NEW.user_id
    LOOP
      notification_message := CASE 
        WHEN OLD.height_cm IS DISTINCT FROM NEW.height_cm THEN 
          'El usuario ha actualizado su altura de ' || COALESCE(OLD.height_cm::TEXT, 'N/A') || ' cm a ' || COALESCE(NEW.height_cm::TEXT, 'N/A') || ' cm.'
        WHEN OLD.weight_kg IS DISTINCT FROM NEW.weight_kg THEN 
          'El usuario ha actualizado su peso de ' || COALESCE(OLD.weight_kg::TEXT, 'N/A') || ' kg a ' || COALESCE(NEW.weight_kg::TEXT, 'N/A') || ' kg.'
        WHEN OLD.goal IS DISTINCT FROM NEW.goal THEN 
          'El usuario ha cambiado su objetivo de "' || COALESCE(OLD.goal, 'N/A') || '" a "' || COALESCE(NEW.goal, 'N/A') || '".'
        WHEN OLD.sex IS DISTINCT FROM NEW.sex THEN 
          'El usuario ha actualizado su información de sexo.'
        WHEN OLD.preferred_name IS DISTINCT FROM NEW.preferred_name THEN 
          'El usuario prefiere que le llames "' || COALESCE(NEW.preferred_name, 'N/A') || '" ahora.'
        ELSE 'El usuario ha actualizado su perfil.'
      END;

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
          'field_name', CASE 
            WHEN OLD.height_cm IS DISTINCT FROM NEW.height_cm THEN 'height_cm'
            WHEN OLD.weight_kg IS DISTINCT FROM NEW.weight_kg THEN 'weight_kg'
            WHEN OLD.goal IS DISTINCT FROM NEW.goal THEN 'goal'
            WHEN OLD.sex IS DISTINCT FROM NEW.sex THEN 'sex'
            WHEN OLD.preferred_name IS DISTINCT FROM NEW.preferred_name THEN 'preferred_name'
          END,
          'old_value', CASE 
            WHEN OLD.height_cm IS DISTINCT FROM NEW.height_cm THEN COALESCE(OLD.height_cm::TEXT, 'N/A')
            WHEN OLD.weight_kg IS DISTINCT FROM NEW.weight_kg THEN COALESCE(OLD.weight_kg::TEXT, 'N/A')
            WHEN OLD.goal IS DISTINCT FROM NEW.goal THEN COALESCE(OLD.goal, 'N/A')
            WHEN OLD.sex IS DISTINCT FROM NEW.sex THEN COALESCE(OLD.sex, 'N/A')
            WHEN OLD.preferred_name IS DISTINCT FROM NEW.preferred_name THEN COALESCE(OLD.preferred_name, 'N/A')
            ELSE 'N/A'
          END,
          'new_value', CASE 
            WHEN OLD.height_cm IS DISTINCT FROM NEW.height_cm THEN COALESCE(NEW.height_cm::TEXT, 'N/A')
            WHEN OLD.weight_kg IS DISTINCT FROM NEW.weight_kg THEN COALESCE(NEW.weight_kg::TEXT, 'N/A')
            WHEN OLD.goal IS DISTINCT FROM NEW.goal THEN COALESCE(NEW.goal, 'N/A')
            WHEN OLD.sex IS DISTINCT FROM NEW.sex THEN COALESCE(NEW.sex, 'N/A')
            WHEN OLD.preferred_name IS DISTINCT FROM NEW.preferred_name THEN COALESCE(NEW.preferred_name, 'N/A')
            ELSE 'N/A'
          END
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to detect profile changes
CREATE TRIGGER profile_change_notification_trigger
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_trainer_profile_change();

