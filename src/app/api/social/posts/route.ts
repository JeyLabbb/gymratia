import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// GET /api/social/posts - Obtener posts (feed)
export async function GET(req: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ posts: [] })
    }

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data: { session } } = await supabase.auth.getSession()
    const searchParams = req.nextUrl.searchParams
    const feedType = searchParams.get('feed') || 'explore'
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'viral'

    // Query principal
    let query = supabase
      .from('social_posts')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtrar por feed type
    if (feedType === 'following' && session) {
      try {
        const { data: follows } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', session.user.id)
        
        if (follows && follows.length > 0) {
          const followingIds = follows.map(f => f.following_id)
          query = query.in('user_id', followingIds)
        } else {
          return NextResponse.json({ posts: [] })
        }
      } catch {
        return NextResponse.json({ posts: [] })
      }
    } else if (feedType === 'user' && userId) {
      query = query.eq('user_id', userId)
    }

    // Ejecutar query
    let posts: any[] = []
    try {
      const result = await query
      if (result.error) {
        return NextResponse.json({ posts: [] })
      }
      posts = result.data || []
    } catch {
      return NextResponse.json({ posts: [] })
    }

    if (posts.length === 0) {
      return NextResponse.json({ posts: [] })
    }

    const postIds = posts.map(p => p.id)

    // Obtener estadísticas de likes, comentarios, shares y views
    const [likesData, commentsData, sharesData, viewsData] = await Promise.all([
      supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', postIds)
        .then(r => ({ data: r.data || [], error: r.error })),
      supabase
        .from('post_comments')
        .select('post_id')
        .in('post_id', postIds)
        .is('deleted_at', null)
        .then(r => ({ data: r.data || [], error: r.error })),
      supabase
        .from('post_shares')
        .select('post_id')
        .in('post_id', postIds)
        .then(r => ({ data: r.data || [], error: r.error })),
      supabase
        .from('post_views')
        .select('post_id')
        .in('post_id', postIds)
        .then(r => ({ data: r.data || [], error: r.error }))
    ])

    // Contar por post
    const likesCountMap = new Map<string, number>()
    const commentsCountMap = new Map<string, number>()
    const sharesCountMap = new Map<string, number>()
    const viewsCountMap = new Map<string, number>()

    likesData.data.forEach((like: any) => {
      likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1)
    })
    commentsData.data.forEach((comment: any) => {
      commentsCountMap.set(comment.post_id, (commentsCountMap.get(comment.post_id) || 0) + 1)
    })
    sharesData.data.forEach((share: any) => {
      sharesCountMap.set(share.post_id, (sharesCountMap.get(share.post_id) || 0) + 1)
    })
    viewsData.data.forEach((view: any) => {
      viewsCountMap.set(view.post_id, (viewsCountMap.get(view.post_id) || 0) + 1)
    })

    // Obtener interacciones del usuario actual (si está autenticado)
    const userInteractionsMap = new Map<string, { liked: boolean, shared: boolean }>()
    if (session?.user?.id) {
      const [userLikes, userShares] = await Promise.all([
        supabase
          .from('post_likes')
          .select('post_id')
          .in('post_id', postIds)
          .eq('user_id', session.user.id)
          .then(r => ({ data: r.data || [], error: r.error })),
        supabase
          .from('post_shares')
          .select('post_id')
          .in('post_id', postIds)
          .eq('user_id', session.user.id)
          .then(r => ({ data: r.data || [], error: r.error }))
      ])

      const likedPostIds = new Set(userLikes.data.map((l: any) => l.post_id))
      const sharedPostIds = new Set(userShares.data.map((s: any) => s.post_id))

      postIds.forEach(postId => {
        userInteractionsMap.set(postId, {
          liked: likedPostIds.has(postId),
          shared: sharedPostIds.has(postId)
        })
      })
    }

    // Obtener perfiles
    const userIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))]
    if (userIds.length === 0) {
      return NextResponse.json({ posts: [] })
    }

    let userProfiles: any[] = []
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds)
      if (data) userProfiles = data
    } catch {}

    let trainerProfiles: any[] = []
    try {
      const { data } = await supabase
        .from('trainers')
        .select('user_id, trainer_name, avatar_url')
        .in('user_id', userIds)
      if (data) trainerProfiles = data
    } catch {}

    const profilesMap = new Map()
    userProfiles.forEach(p => profilesMap.set(p.user_id, p))
    trainerProfiles.forEach(t => profilesMap.set(t.user_id, { ...t, isTrainer: true }))

    // Enriquecer posts
    const enrichedPosts = posts.map((post) => {
      const profile = profilesMap.get(post.user_id)
      const trainerProfile = trainerProfiles.find(t => t.user_id === post.user_id)
      
      const authorName = post.is_trainer && trainerProfile
        ? trainerProfile.trainer_name
        : profile?.full_name || 'Usuario'
      
      const authorAvatar = post.is_trainer && trainerProfile
        ? trainerProfile.avatar_url
        : profile?.avatar_url || null

      const likes = likesCountMap.get(post.id) || 0
      const comments = commentsCountMap.get(post.id) || 0
      const shares = sharesCountMap.get(post.id) || 0
      const views = viewsCountMap.get(post.id) || 0
      
      // Calcular viral_score: likes * 2 + comments * 3 + shares * 5 + views * 0.1
      const viral_score = (likes * 2) + (comments * 3) + (shares * 5) + (views * 0.1)

      const userInteractions = userInteractionsMap.get(post.id) || { liked: false, shared: false }

      return {
        ...post,
        user_id: post.user_id,
        author: {
          name: authorName,
          avatar: authorAvatar,
          is_trainer: post.is_trainer,
          user_id: post.user_id
        },
        stats: {
          likes,
          comments,
          shares,
          views,
          viral_score
        },
        user_interactions: userInteractions
      }
    })

    if (sortBy === 'viral') {
      enrichedPosts.sort((a, b) => b.stats.viral_score - a.stats.viral_score)
    }

    return NextResponse.json({ posts: enrichedPosts })
  } catch {
    return NextResponse.json({ posts: [] })
  }
}

// POST /api/social/posts - Crear un nuevo post
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Crear cliente autenticado con el token del usuario para que RLS funcione
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { content, post_type, media_urls, tags } = body

    // Validar post_type
    const validPostTypes = ['photo', 'video', 'thread', 'text']
    const finalPostType = validPostTypes.includes(post_type) ? post_type : 'photo'

    const { data: trainer } = await supabase
      .from('trainers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    const isTrainer = !!trainer

    if (!content && (!media_urls || media_urls.length === 0)) {
      return NextResponse.json(
        { error: 'El post debe tener contenido o al menos una imagen/video' },
        { status: 400 }
      )
    }

    // Validar y limpiar tags
    const validTags = Array.isArray(tags) 
      ? tags
          .filter(t => typeof t === 'string' && t.length > 0 && t.length <= 50)
          .map(t => String(t).toLowerCase().replace(/[^a-z0-9-]/g, ''))
          .filter(t => t.length > 0)
          .slice(0, 10) // Limitar a 10 tags máximo
      : []

    // Validar media_urls
    const validMediaUrls = Array.isArray(media_urls) 
      ? media_urls.filter(url => typeof url === 'string' && url.length > 0)
      : []

    const insertData: any = {
      user_id: user.id,
      content: content ? String(content).trim() : null,
      post_type: finalPostType,
      is_trainer: isTrainer
    }

    // Añadir media_urls (JSONB) - puede ser null o array
    if (validMediaUrls.length > 0) {
      insertData.media_urls = validMediaUrls
    } else {
      insertData.media_urls = null
    }

    // Añadir tags (TEXT[]) - puede ser null o array
    if (validTags.length > 0) {
      insertData.tags = validTags
    } else {
      insertData.tags = null
    }

    const { data: post, error } = await supabase
      .from('social_posts')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error inserting post:', error)
      console.error('Post data:', {
        user_id: user.id,
        content: content ? content.substring(0, 50) : null,
        post_type: finalPostType,
        media_urls_count: media_urls?.length || 0,
        is_trainer: isTrainer,
        tags_count: validTags.length
      })
      return NextResponse.json({ 
        error: error.message || 'Error al crear el post',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, { status: 500 })
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/social/posts:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

// DELETE /api/social/posts?id=xxx - Eliminar un post (soft delete)
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Crear cliente autenticado con el token del usuario para que RLS funcione
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const postId = searchParams.get('id')

    if (!postId) {
      return NextResponse.json({ error: 'ID de post requerido' }, { status: 400 })
    }

    const { data: post } = await supabase
      .from('social_posts')
      .select('user_id')
      .eq('id', postId)
      .single()

    if (!post || post.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { error } = await supabase
      .from('social_posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', postId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

