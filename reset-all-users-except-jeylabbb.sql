-- Reset all users except jeylabbb@gmail.com
-- ⚠️ WARNING: This will DELETE ALL users and their data except jeylabbb@gmail.com
-- Run this in your Supabase SQL Editor

-- Step 1: Find the user_id of jeylabbb@gmail.com
DO $$
DECLARE
  jey_user_id UUID;
BEGIN
  -- Get the user_id for jeylabbb@gmail.com
  SELECT id INTO jey_user_id
  FROM auth.users
  WHERE email = 'jeylabbb@gmail.com';
  
  IF jey_user_id IS NULL THEN
    RAISE EXCEPTION 'User jeylabbb@gmail.com not found!';
  END IF;
  
  RAISE NOTICE 'Found jeylabbb@gmail.com with user_id: %', jey_user_id;
  
  -- Step 2: Delete all data from tables that reference user_id (CASCADE will handle most, but we'll be explicit)
  -- Delete from tables that might not have CASCADE or need explicit deletion
  
  -- Delete social posts (except from jey)
  DELETE FROM social_posts WHERE user_id != jey_user_id;
  
  -- Delete post comments (CASCADE should handle, but being explicit)
  DELETE FROM post_comments 
  WHERE post_id IN (SELECT id FROM social_posts WHERE user_id != jey_user_id);
  
  -- Delete post likes (CASCADE should handle, but being explicit)
  DELETE FROM post_likes 
  WHERE post_id IN (SELECT id FROM social_posts WHERE user_id != jey_user_id);
  
  -- Delete comment likes (CASCADE should handle, but being explicit)
  DELETE FROM comment_likes 
  WHERE comment_id IN (
    SELECT id FROM post_comments 
    WHERE post_id IN (SELECT id FROM social_posts WHERE user_id != jey_user_id)
  );
  
  -- Delete post views
  DELETE FROM post_views 
  WHERE post_id IN (SELECT id FROM social_posts WHERE user_id != jey_user_id);
  
  -- Delete post shares (CASCADE should handle, but being explicit)
  DELETE FROM post_shares 
  WHERE post_id IN (SELECT id FROM social_posts WHERE user_id != jey_user_id)
     OR user_id != jey_user_id;
  
  -- Delete user follows (CASCADE should handle, but being explicit)
  DELETE FROM user_follows 
  WHERE follower_id != jey_user_id AND following_id != jey_user_id;
  
  -- Delete user messages (except for jey)
  DELETE FROM user_messages WHERE user_id != jey_user_id;
  
  -- Delete trainer notifications (except for jey)
  DELETE FROM trainer_notifications WHERE user_id != jey_user_id;
  
  -- Delete plans (if exists)
  DELETE FROM plans WHERE user_id != jey_user_id;
  
  -- Delete progress tracking (CASCADE should handle, but being explicit)
  DELETE FROM progress_tracking WHERE user_id != jey_user_id;
  
  -- Delete progress photos (CASCADE should handle, but being explicit)
  DELETE FROM progress_photos WHERE user_id != jey_user_id;
  
  -- Delete exercise logs (CASCADE should handle, but being explicit)
  DELETE FROM exercise_logs 
  WHERE workout_id IN (
    SELECT id FROM user_workouts WHERE user_id != jey_user_id
  );
  
  -- Delete user workouts (CASCADE should handle, but being explicit)
  DELETE FROM user_workouts WHERE user_id != jey_user_id;
  
  -- Delete meal planners (CASCADE should handle, but being explicit)
  DELETE FROM meal_planners WHERE user_id != jey_user_id;
  
  -- Delete user diets (CASCADE should handle, but being explicit)
  DELETE FROM user_diets WHERE user_id != jey_user_id;
  
  -- Delete user food categories (CASCADE should handle, but being explicit)
  DELETE FROM user_food_categories WHERE user_id != jey_user_id;
  
  -- Delete trainers that belong to users (but keep system trainers like 'jey' and 'carolina' that don't have user_id)
  DELETE FROM trainers WHERE user_id IS NOT NULL AND user_id != jey_user_id;
  
  -- Delete trainer certificates (if table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trainer_certificates') THEN
    DELETE FROM trainer_certificates 
    WHERE trainer_id IN (
      SELECT id FROM trainers WHERE user_id IS NOT NULL AND user_id != jey_user_id
    );
  END IF;
  
  -- Delete chat messages (CASCADE should handle, but being explicit)
  DELETE FROM chat_messages 
  WHERE chat_id IN (
    SELECT id FROM trainer_chats WHERE user_id != jey_user_id
  );
  
  -- Delete trainer chats (CASCADE should handle, but being explicit)
  DELETE FROM trainer_chats WHERE user_id != jey_user_id;
  
  -- Delete user preferences (CASCADE should handle, but being explicit)
  DELETE FROM user_preferences WHERE user_id != jey_user_id;
  
  -- Delete user profiles (CASCADE should handle, but being explicit)
  DELETE FROM user_profiles WHERE user_id != jey_user_id;
  
  -- Delete checkins if table exists (CASCADE should handle, but being explicit)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checkins') THEN
    DELETE FROM checkins WHERE user_id != jey_user_id;
  END IF;
  
  -- Delete posts if table exists (CASCADE should handle, but being explicit)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts') THEN
    DELETE FROM posts WHERE user_id != jey_user_id;
  END IF;
  
  -- Step 3: Delete all users except jeylabbb@gmail.com
  -- This will CASCADE delete all remaining data
  DELETE FROM auth.users WHERE id != jey_user_id;
  
  RAISE NOTICE 'Reset complete! Only jeylabbb@gmail.com remains.';
END $$;

-- Verify: Show remaining users
SELECT id, email, created_at 
FROM auth.users
ORDER BY created_at;

-- Verify: Show remaining user profiles
SELECT up.id, up.user_id, up.full_name, up.email, u.email as auth_email
FROM user_profiles up
JOIN auth.users u ON u.id = up.user_id
ORDER BY up.created_at;

-- Verify: Show remaining trainers (should include system trainers like 'jey' and 'carolina')
SELECT id, slug, trainer_name, user_id, email
FROM trainers
ORDER BY created_at;
