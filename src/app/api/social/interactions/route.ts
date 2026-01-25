import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// POST /api/social/interactions?action=like&postId=xxx - Like/Unlike
// POST /api/social/interactions?action=share&postId=xxx - Compartir
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

    const searchParams = req.nextUrl.searchParams
    const action = searchParams.get('action') // 'like' | 'unlike' | 'share' | 'like_comment' | 'unlike_comment'
    const postId = searchParams.get('postId')
    const commentId = searchParams.get('commentId')

    // Para likes de comentarios, necesitamos commentId
    if ((action === 'like_comment' || action === 'unlike_comment') && !commentId) {
      return NextResponse.json(
        { error: 'commentId es requerido para esta acción' },
        { status: 400 }
      )
    }

    // Para acciones de post, necesitamos postId
    if ((action === 'like' || action === 'unlike' || action === 'share') && !postId) {
      return NextResponse.json(
        { error: 'postId es requerido para esta acción' },
        { status: 400 }
      )
    }

    if (action === 'like_comment') {
      // Dar like a un comentario
      try {
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id
          })

        if (error) {
          if (error.code === '23505') {
            // Ya existe el like, devolver éxito
            return NextResponse.json({ success: true, liked: true })
          }
          if (error.code === '42P01') {
            // Tabla no existe
            console.error('Tabla comment_likes no existe. Ejecuta add-comment-likes.sql')
            return NextResponse.json({ 
              error: 'La tabla de likes de comentarios no existe. Contacta al administrador.' 
            }, { status: 500 })
          }
          console.error('Error liking comment:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, liked: true })
      } catch (err: any) {
        console.error('Exception liking comment:', err)
        return NextResponse.json({ error: err.message || 'Error desconocido' }, { status: 500 })
      }
    } else if (action === 'unlike_comment') {
      // Quitar like de un comentario
      try {
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)

        if (error) {
          if (error.code === '42P01') {
            console.error('Tabla comment_likes no existe. Ejecuta add-comment-likes.sql')
            return NextResponse.json({ 
              error: 'La tabla de likes de comentarios no existe. Contacta al administrador.' 
            }, { status: 500 })
          }
          console.error('Error unliking comment:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, liked: false })
      } catch (err: any) {
        console.error('Exception unliking comment:', err)
        return NextResponse.json({ error: err.message || 'Error desconocido' }, { status: 500 })
      }
    } else if (action === 'like') {
      // Dar like
      const { error } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: user.id
        })

      if (error) {
        // Si ya existe, no es un error real
        if (error.code === '23505') {
          return NextResponse.json({ success: true, liked: true })
        }
        console.error('Error liking post:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, liked: true })
    } else if (action === 'unlike') {
      // Quitar like
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error unliking post:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, liked: false })
    } else if (action === 'share') {
      // Compartir (registrar en estadísticas)
      const { error } = await supabase
        .from('post_shares')
        .insert({
          post_id: postId,
          user_id: user.id
        })

      if (error) {
        // Si ya existe, no es un error real
        if (error.code === '23505') {
          return NextResponse.json({ success: true, shared: true })
        }
        console.error('Error sharing post:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, shared: true })
    } else {
      return NextResponse.json(
        { error: 'Acción no válida' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error in POST /api/social/interactions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/social/interactions/comment - Añadir comentario
export async function PUT(req: NextRequest) {
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
    const { postId, content, parentCommentId } = body

    if (!postId || !content) {
      return NextResponse.json(
        { error: 'postId y content son requeridos' },
        { status: 400 }
      )
    }

    const { data: comment, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_comment_id: parentCommentId || null
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Obtener información del autor
    const [userProfile, trainerProfile] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('trainers')
        .select('trainer_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()
    ])

    const authorName = trainerProfile.data?.trainer_name || userProfile.data?.full_name || 'Usuario'
    const authorAvatar = trainerProfile.data?.avatar_url || userProfile.data?.avatar_url || null

    return NextResponse.json({
      comment: {
        ...comment,
        author: {
          name: authorName,
          avatar: authorAvatar
        }
      }
    })
  } catch (error: any) {
    console.error('Error in PUT /api/social/interactions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/social/interactions?postId=xxx - Obtener comentarios
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const searchParams = req.nextUrl.searchParams
    const postId = searchParams.get('postId')
    const authHeader = req.headers.get('authorization')
    let currentUserId: string | null = null

    // Intentar obtener usuario actual si hay token
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const authSupabase = createSupabaseClient(
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
        const { data: { user } } = await authSupabase.auth.getUser(token)
        currentUserId = user?.id || null
      } catch {}
    }

    if (!postId) {
      return NextResponse.json(
        { error: 'postId es requerido' },
        { status: 400 }
      )
    }

    // Obtener comentarios principales (sin parent_comment_id)
    const { data: comments, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .is('deleted_at', null)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json({ comments: [] })
    }

    // Obtener respuestas (comentarios con parent_comment_id)
    const commentIds = comments.map(c => c.id)
    const { data: replies } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .is('deleted_at', null)
      .in('parent_comment_id', commentIds)
      .order('created_at', { ascending: true })

    // Obtener todos los IDs de usuarios (comentarios principales + respuestas)
    const allCommentUserIds = [...new Set([
      ...comments.map(c => c.user_id),
      ...(replies || []).map(r => r.user_id)
    ])]

    // Obtener información de usuarios y entrenadores
    const [commentUserProfiles, commentTrainerProfiles] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', allCommentUserIds),
      supabase
        .from('trainers')
        .select('user_id, trainer_name, avatar_url')
        .in('user_id', allCommentUserIds)
    ])

    // Obtener likes de comentarios
    const allCommentIds = [...commentIds, ...(replies || []).map(r => r.id)]
    let commentLikes: any[] = []
    if (currentUserId && allCommentIds.length > 0) {
      try {
        const { data, error } = await supabase
          .from('comment_likes')
          .select('comment_id, user_id')
          .in('comment_id', allCommentIds)
        
        if (error && error.code !== '42P01') {
          // Si la tabla no existe (42P01), simplemente no hay likes
          console.warn('Error fetching comment likes:', error.message)
        } else if (data) {
          commentLikes = data
        }
      } catch (err) {
        // Si la tabla no existe, simplemente continuar sin likes
        console.warn('Exception fetching comment likes:', err)
      }
    }

    // Contar likes por comentario
    const likesCountMap = new Map<string, number>()
    const userLikedMap = new Map<string, boolean>()
    
    commentLikes?.forEach(like => {
      const count = likesCountMap.get(like.comment_id) || 0
      likesCountMap.set(like.comment_id, count + 1)
      if (like.user_id === currentUserId) {
        userLikedMap.set(like.comment_id, true)
      }
    })

    const commentProfilesMap = new Map()
    commentUserProfiles.data?.forEach(p => commentProfilesMap.set(p.user_id, p))
    commentTrainerProfiles.data?.forEach(t => commentProfilesMap.set(t.user_id, { ...t, isTrainer: true }))

    // Función para enriquecer comentarios
    const enrichComment = (comment: any) => {
      const profile = commentProfilesMap.get(comment.user_id)
      const trainerProfile = commentTrainerProfiles.data?.find(t => t.user_id === comment.user_id)
      
      const authorName = trainerProfile?.trainer_name || profile?.full_name || 'Usuario'
      const authorAvatar = trainerProfile?.avatar_url || profile?.avatar_url || null

      return {
        ...comment,
        author: {
          name: authorName,
          avatar: authorAvatar
        },
        likes_count: likesCountMap.get(comment.id) || 0,
        user_liked: userLikedMap.get(comment.id) || false
      }
    }

    // Enriquecer comentarios principales y añadir sus respuestas
    const enrichedComments = comments.map(comment => {
      const enriched = enrichComment(comment)
      const commentReplies = (replies || [])
        .filter(r => r.parent_comment_id === comment.id)
        .map(reply => enrichComment(reply))
      
      return {
        ...enriched,
        replies: commentReplies
      }
    })

    return NextResponse.json({ comments: enrichedComments })
  } catch (error: any) {
    console.error('Error in GET /api/social/interactions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/social/interactions?commentId=xxx - Eliminar comentario
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Crear cliente y establecer sesión para que RLS funcione correctamente
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    )
    
    // Establecer la sesión para que RLS pueda identificar al usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error in DELETE comment:', authError)
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    
    // Establecer sesión explícitamente para RLS
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: ''
    } as any)

    const searchParams = req.nextUrl.searchParams
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json(
        { error: 'commentId es requerido' },
        { status: 400 }
      )
    }

    // Obtener el comentario para verificar permisos
    const { data: comment, error: fetchError } = await supabase
      .from('post_comments')
      .select('user_id, post_id')
      .eq('id', commentId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !comment) {
      return NextResponse.json(
        { error: 'Comentario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si es el autor del comentario o el dueño del post
    const isCommentAuthor = comment.user_id === user.id
    
    // Verificar si es el dueño del post
    const { data: post } = await supabase
      .from('social_posts')
      .select('user_id')
      .eq('id', comment.post_id)
      .single()
    
    const isPostOwner = post?.user_id === user.id

    if (!isCommentAuthor && !isPostOwner) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este comentario' },
        { status: 403 }
      )
    }

    // Soft delete del comentario usando el mismo cliente que ya tiene el token configurado
    const { error: deleteError, data: updateData } = await supabase
      .from('post_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)
      .select()

    if (deleteError) {
      console.error('Error deleting comment:', deleteError)
      console.error('Comment ID:', commentId)
      console.error('User ID:', user.id)
      console.error('Comment user_id:', comment.user_id)
      console.error('Post user_id:', post?.user_id)
      return NextResponse.json({ 
        error: deleteError.message,
        details: deleteError.details || deleteError.hint || 'No additional details'
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/social/interactions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

