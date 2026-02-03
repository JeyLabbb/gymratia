import { createClient } from '@supabase/supabase-js'

export type PublicPost = {
  id: string
  user_id: string
  content: string | null
  post_type: string
  media_urls: string[] | null
  tags: string[] | null
  created_at: string
  is_trainer: boolean
  author: {
    name: string
    avatar: string | null
    is_trainer: boolean
  }
  stats: {
    likes: number
    comments: number
    views: number
  }
}

/**
 * Obtiene un post público por ID para SEO y página pública.
 * Usa anon key; RLS "Anyone can view non-deleted posts" debe permitir SELECT.
 */
export async function getPublicPost(postId: string): Promise<PublicPost | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  try {
    const supabase = createClient(url, key)
    const { data: post, error } = await supabase
      .from('social_posts')
      .select('id, user_id, content, post_type, media_urls, tags, created_at, is_trainer')
      .eq('id', postId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error || !post) return null

    const userId = post.user_id
    let authorName = 'Usuario'
    let authorAvatar: string | null = null

    if (post.is_trainer) {
      const { data: trainer } = await supabase
        .from('trainers')
        .select('trainer_name, avatar_url')
        .eq('user_id', userId)
        .maybeSingle()
      if (trainer) {
        authorName = trainer.trainer_name || authorName
        authorAvatar = trainer.avatar_url || null
      }
    }
    if (authorName === 'Usuario') {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, avatar_url')
        .eq('user_id', userId)
        .maybeSingle()
      if (profile?.full_name) authorName = profile.full_name
      if (profile?.avatar_url) authorAvatar = profile.avatar_url
    }

    // Usar service role para estadísticas (post_views solo permite SELECT al autor con anon)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseStats = serviceKey ? createClient(url, serviceKey) : supabase

    const [likesRes, commentsRes, viewsRes] = await Promise.all([
      supabaseStats.from('post_likes').select('id', { count: 'exact', head: true }).eq('post_id', postId),
      supabaseStats.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', postId).is('deleted_at', null),
      supabaseStats.from('post_views').select('id', { count: 'exact', head: true }).eq('post_id', postId),
    ])

    const likes = likesRes.count ?? 0
    const comments = commentsRes.count ?? 0
    const views = viewsRes.count ?? 0

    return {
      id: post.id,
      user_id: post.user_id,
      content: post.content ?? null,
      post_type: post.post_type,
      media_urls: Array.isArray(post.media_urls) ? post.media_urls : null,
      tags: Array.isArray(post.tags) ? post.tags : null,
      created_at: post.created_at,
      is_trainer: post.is_trainer ?? false,
      author: {
        name: authorName,
        avatar: authorAvatar,
        is_trainer: post.is_trainer ?? false,
      },
      stats: { likes, comments, views },
    }
  } catch {
    return null
  }
}
