// Database types for Supabase

export type UserProfile = {
  id: string
  user_id: string
  full_name?: string
  email?: string
  avatar_url?: string
  height_cm?: number
  weight_kg?: number
  goal?: string
  sex?: string
  created_at: string
  updated_at: string
}

export type ChatMessage = {
  id: string
  chat_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type TrainerChat = {
  id: string
  user_id: string
  trainer_slug: 'edu' | 'carolina'
  created_at: string
  updated_at: string
  last_message_at?: string
}

export type UserPreferences = {
  id: string
  user_id: string
  public_profile: boolean
  public_progress: boolean
  created_at: string
  updated_at: string
}


