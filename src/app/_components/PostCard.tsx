"use client"

import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Share2, MoreVertical, Trash2, Eye, Reply } from 'lucide-react'
import SafeImage from './SafeImage'
import { cn } from '@/lib/utils'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'

type Post = {
  id: string
  user_id: string
  content?: string
  post_type: 'photo' | 'video' | 'thread' | 'text'
  media_urls?: string[]
  is_trainer: boolean
  tags?: string[]
  created_at: string
  author: {
    name: string
    avatar?: string
    is_trainer: boolean
    user_id?: string
  }
  stats: {
    likes: number
    comments: number
    shares: number
    views: number
    viral_score: number
  }
  user_interactions: {
    liked: boolean
    shared: boolean
  }
}

type PostCardProps = {
  post: Post
  onLike?: (postId: string, liked: boolean) => void
  onComment?: (postId: string) => void
  onShare?: (postId: string) => void
  onDelete?: (postId: string) => void
  onAuthorClick?: (userId: string) => void
  showComments?: boolean
  currentUserId?: string
}

export default function PostCard({
  post,
  onLike,
  onComment,
  onShare,
  onDelete,
  onAuthorClick,
  showComments = false,
  currentUserId
}: PostCardProps) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(post.user_interactions?.liked || false)
  const [likesCount, setLikesCount] = useState(post.stats?.likes || 0)
  const [shared, setShared] = useState(post.user_interactions?.shared || false)
  const [sharesCount, setSharesCount] = useState(post.stats?.shares || 0)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [showCommentsSection, setShowCommentsSection] = useState(showComments)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [commentsCount, setCommentsCount] = useState(post.stats?.comments || 0)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  // Obtener token de sesión para las peticiones
  const getAuthHeaders = async () => {
    if (!user) return {}
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        return {
          'Authorization': `Bearer ${session.access_token}`
        }
      }
    } catch {}
    return {}
  }

  // Registrar visita cuando se muestra el post
  useEffect(() => {
    const registerView = async () => {
      // Pequeño delay para asegurar que el post está renderizado
      await new Promise(resolve => setTimeout(resolve, 100))
      
      try {
        let headers: Record<string, string> = {}
        if (user) {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
              headers['Authorization'] = `Bearer ${session.access_token}`
            }
          } catch {}
        }
        const res = await fetch(`/api/social/views?postId=${post.id}`, { 
          method: 'POST',
          headers
        })
        // No necesitamos hacer nada con la respuesta, solo registrar
      } catch (error) {
        // Silenciar errores de vistas
        console.debug('Error registering view:', error)
      }
    }
    
    registerView()
  }, [post.id, user])

  // Cargar comentarios si se muestran
  useEffect(() => {
    if (showCommentsSection) {
      loadComments()
    }
  }, [showCommentsSection, post.id])

  const loadComments = async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/social/interactions?postId=${post.id}`, {
        headers
      })
      if (!res.ok) {
        console.error('Error loading comments:', res.status)
        return
      }
      let data
      try {
        const text = await res.text()
        if (!text) {
          console.debug('Empty response for comments')
          return
        }
        data = JSON.parse(text)
      } catch (parseError) {
        console.error('Error parsing comments JSON:', parseError)
        return
      }
      if (data.comments) {
        setComments(data.comments)
        // Contar comentarios principales + respuestas
        const totalCount = data.comments.reduce((acc: number, c: any) => acc + 1 + (c.replies?.length || 0), 0)
        setCommentsCount(totalCount)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  const handleLike = async () => {
    if (!user) {
      alert('Por favor, inicia sesión para poder dar like a las publicaciones')
      return
    }
    if (!user) return
    
    const newLiked = !liked
    setLiked(newLiked)
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1)

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(
        `/api/social/interactions?action=${newLiked ? 'like' : 'unlike'}&postId=${post.id}`,
        { 
          method: 'POST',
          headers
        }
      )
      if (!res.ok) {
        // Revertir si falla
        setLiked(!newLiked)
        setLikesCount(prev => newLiked ? prev - 1 : prev + 1)
        const errorText = await res.text().catch(() => 'Error desconocido')
        console.error('Error toggling like:', res.status, errorText)
        return
      }
      
      // Verificar respuesta JSON válida
      let data
      try {
        data = await res.json()
      } catch (parseError) {
        console.error('Error parsing like response:', parseError)
        // Si la respuesta fue OK pero no es JSON válido, asumimos éxito
        onLike?.(post.id, newLiked)
        return
      }
      
      if (data.success !== false) {
        onLike?.(post.id, newLiked)
      } else {
        // Revertir si la respuesta indica fallo
        setLiked(!newLiked)
        setLikesCount(prev => newLiked ? prev - 1 : prev + 1)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      setLiked(!newLiked)
      setLikesCount(prev => newLiked ? prev - 1 : prev + 1)
    }
  }

  const handleShare = async () => {
    if (!user) return
    
    const newShared = !shared
    setShared(newShared)
    if (newShared) {
      setSharesCount(prev => prev + 1)
    }

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/social/interactions?action=share&postId=${post.id}`, {
        method: 'POST',
        headers
      })
      if (!res.ok) {
        setShared(!newShared)
        if (newShared) {
          setSharesCount(prev => prev - 1)
        }
        const errorText = await res.text().catch(() => 'Error desconocido')
        console.error('Error sharing:', res.status, errorText)
      } else {
        // Verificar respuesta JSON válida
        try {
          await res.json()
        } catch (parseError) {
          console.debug('Share response not JSON, assuming success')
        }
      }
      
      // Copiar link al portapapeles (siempre, incluso si falla el registro)
      const postUrl = `${window.location.origin}/explore?post=${post.id}`
      copyToClipboard(postUrl)
      
      if (res.ok) {
        onShare?.(post.id)
      }
    } catch (error) {
      console.error('Error sharing:', error)
      setShared(!newShared)
      if (newShared) {
        setSharesCount(prev => prev - 1)
      }
      // Aún así, intentar copiar el link
      const postUrl = `${window.location.origin}/explore?post=${post.id}`
      copyToClipboard(postUrl)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      // Intentar usar la API moderna de clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        alert('¡Link copiado al portapapeles!')
        return
      }
    } catch (clipboardError: any) {
      // Si falla por permisos o contexto, usar fallback
      console.debug('Clipboard API failed, using fallback:', clipboardError)
    }

    // Fallback: usar método antiguo
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '0'
      textArea.setAttribute('readonly', '')
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        alert('¡Link copiado al portapapeles!')
      } else {
        // Si todo falla, mostrar el link para copiar manualmente
        prompt('Copia este link:', text)
      }
    } catch (fallbackError) {
      // Si todo falla, mostrar el link para copiar manualmente
      prompt('Copia este link:', text)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta publicación?')) return

    if (!user) {
      alert('Debes estar autenticado para eliminar publicaciones')
      setShowDeleteMenu(false)
      return
    }

    try {
      const headers = await getAuthHeaders()
      if (!headers.Authorization) {
        alert('Error de autenticación. Por favor, recarga la página.')
        setShowDeleteMenu(false)
        return
      }

      const res = await fetch(`/api/social/posts?id=${post.id}`, { 
        method: 'DELETE',
        headers
      })
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Error desconocido')
        console.error('Error deleting post:', res.status, errorText)
        alert(`Error al eliminar: ${errorText}`)
        setShowDeleteMenu(false)
        return
      }

      onDelete?.(post.id)
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Error al eliminar la publicación')
    }
    setShowDeleteMenu(false)
  }

  const handlePostComment = async (parentCommentId?: string) => {
    if (!user) {
      alert('Por favor, inicia sesión para poder comentar')
      return
    }
    
    const content = parentCommentId ? replyText : newComment
    if (!content.trim() || postingComment) return

    setPostingComment(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/social/interactions', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          postId: post.id,
          content,
          parentCommentId: parentCommentId || null
        })
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Error desconocido')
        console.error('Error posting comment:', res.status, errorText)
        alert('Error al publicar el comentario')
        return
      }

      let data
      try {
        data = await res.json()
      } catch (parseError) {
        console.error('Error parsing comment response:', parseError)
        alert('Error al procesar la respuesta del servidor')
        return
      }

      if (data.comment) {
        if (parentCommentId) {
          // Es una respuesta
          setComments(prev => prev.map(c => {
            if (c.id === parentCommentId) {
              return {
                ...c,
                replies: [...(c.replies || []), data.comment]
              }
            }
            return c
          }))
          setReplyText('')
          setReplyingTo(null)
        } else {
          // Es un comentario principal
          setComments(prev => [...prev, { ...data.comment, replies: [] }])
          setNewComment('')
        }
        setCommentsCount(prev => prev + 1)
      } else {
        alert('Error: respuesta inválida del servidor')
      }
    } catch (error) {
      console.error('Error posting comment:', error)
      alert('Error al publicar el comentario')
    } finally {
      setPostingComment(false)
    }
  }

  const handleLikeComment = async (commentId: string, currentlyLiked: boolean) => {
    if (!user) {
      alert('Debes estar autenticado para dar like')
      return
    }

    try {
      const headers = await getAuthHeaders()
      if (!headers.Authorization) {
        alert('Error de autenticación. Por favor, recarga la página.')
        return
      }

      const res = await fetch(
        `/api/social/interactions?action=${currentlyLiked ? 'unlike_comment' : 'like_comment'}&commentId=${commentId}`,
        {
          method: 'POST',
          headers
        }
      )

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Error desconocido')
        console.error('Error toggling comment like:', res.status, errorText)
        alert(`Error: ${errorText}`)
        return
      }

      // Actualizar el estado del comentario
      setComments(prev => prev.map(comment => {
        const updateComment = (c: any) => {
          if (c.id === commentId) {
            return {
              ...c,
              user_liked: !currentlyLiked,
              likes_count: currentlyLiked ? Math.max(0, (c.likes_count || 1) - 1) : (c.likes_count || 0) + 1
            }
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r: any) => updateComment(r))
            }
          }
          return c
        }
        return updateComment(comment)
      }))
    } catch (error) {
      console.error('Error toggling comment like:', error)
      alert('Error al dar like al comentario')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este comentario?')) return

    if (!user) {
      alert('Debes estar autenticado para eliminar comentarios')
      return
    }

    try {
      const headers = await getAuthHeaders()
      if (!headers.Authorization) {
        alert('Error de autenticación. Por favor, recarga la página.')
        return
      }

      const res = await fetch(`/api/social/interactions?commentId=${commentId}`, {
        method: 'DELETE',
        headers
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Error desconocido')
        console.error('Error deleting comment:', res.status, errorText)
        alert(`Error al eliminar: ${errorText}`)
        return
      }

      // Eliminar el comentario del estado
      setComments(prev => {
        // Primero eliminar de respuestas
        const updated = prev.map(c => ({
          ...c,
          replies: (c.replies || []).filter((r: any) => r.id !== commentId)
        }))
        // Luego eliminar comentarios principales
        return updated.filter(c => c.id !== commentId)
      })
      
      // Recalcular contador
      setComments(prev => {
        const total = prev.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)
        setCommentsCount(total)
        return prev
      })
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Error al eliminar el comentario')
    }
  }

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const postDate = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Ahora'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`
    return postDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const isOwner = currentUserId && (post.user_id === currentUserId || post.author.user_id === currentUserId)

  return (
    <div 
      data-post-id={post.id}
      className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[16px] overflow-hidden hover:border-[rgba(255,255,255,0.12)] transition-all shadow-lg max-w-2xl mx-auto">
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-[rgba(255,255,255,0.05)]">
        <div 
          className="flex items-center gap-2.5 flex-1 cursor-pointer"
          onClick={() => onAuthorClick?.(post.user_id || post.author.user_id || '')}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#FF2D2D] to-[#7F1D1D] flex-shrink-0 ring-1 ring-[rgba(255,255,255,0.1)]">
            {post.author.avatar ? (
              <SafeImage
                src={post.author.avatar}
                alt={post.author.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-base font-bold">
                {post.author.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-[#F8FAFC] truncate">{post.author.name}</p>
              {post.is_trainer && (
                <span className="px-2.5 py-1 bg-[#FF2D2D]/20 text-[#FF6B6B] text-xs font-semibold rounded-full border border-[#FF2D2D]/30">
                  Entrenador
                </span>
              )}
            </div>
            <p className="text-xs text-[#7B8291]">{formatTimeAgo(post.created_at)}</p>
          </div>
        </div>
        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setShowDeleteMenu(!showDeleteMenu)}
              className="p-2 rounded-lg hover:bg-[#1A1D24] transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-[#A7AFBE]" />
            </button>
            {showDeleteMenu && (
              <div className="absolute right-0 top-full mt-2 bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-lg shadow-lg z-10 min-w-[120px]">
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 text-left text-sm text-[#EF4444] hover:bg-[#14161B] flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-3 py-2.5">
          <p className="text-[#F8FAFC] whitespace-pre-wrap leading-relaxed text-sm">{post.content}</p>
        </div>
      )}

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className={cn(
          "relative bg-[#0A0A0B] w-full overflow-hidden",
          post.media_urls.length === 1 ? "flex items-center justify-center min-h-[300px] max-h-[500px]" : "aspect-video max-h-[400px]"
        )}>
          {post.post_type === 'video' ? (
            <video
              src={post.media_urls[0]}
              controls
              className="w-full h-full max-h-[500px] object-contain"
            />
          ) : (
            <div className={cn(
              "w-full h-full grid gap-1",
              post.media_urls.length === 1 ? "grid-cols-1" : post.media_urls.length === 2 ? "grid-cols-2" : "grid-cols-2"
            )}>
              {post.media_urls.slice(0, 4).map((url, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "relative w-full h-full flex items-center justify-center bg-[#0A0A0B] overflow-hidden",
                    post.media_urls.length === 1 ? "min-h-[300px] max-h-[500px]" : "aspect-square"
                  )}
                >
                  <SafeImage
                    src={url}
                    alt={`Post media ${idx + 1}`}
                    className={cn(
                      post.media_urls.length === 1 
                        ? "max-w-full max-h-full w-auto h-auto object-contain mx-auto my-auto" 
                        : "w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    )}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="px-3 py-2 flex flex-wrap gap-1.5">
          {post.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-[#1A1D24] text-[#FF2D2D] text-xs rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-3 py-2.5 border-t border-[rgba(255,255,255,0.05)] bg-[#1A1D24]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all",
                liked 
                  ? "text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20" 
                  : "text-[#A7AFBE] hover:text-[#EF4444] hover:bg-[#1A1D24]"
              )}
            >
              <Heart className={cn("w-4 h-4 transition-transform", liked && "fill-current scale-110")} />
              <span className="text-xs font-semibold">{likesCount}</span>
            </button>
            <button
              onClick={() => setShowCommentsSection(!showCommentsSection)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all",
                showCommentsSection
                  ? "text-[#FF2D2D] bg-[#FF2D2D]/10"
                  : "text-[#A7AFBE] hover:text-[#FF2D2D] hover:bg-[#1A1D24]"
              )}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-semibold">{commentsCount}</span>
            </button>
            <button
              onClick={handleShare}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all",
                shared 
                  ? "text-[#10B981] bg-[#10B981]/10 hover:bg-[#10B981]/20" 
                  : "text-[#A7AFBE] hover:text-[#10B981] hover:bg-[#1A1D24]"
              )}
            >
              <Share2 className="w-4 h-4" />
              <span className="text-xs font-semibold">{sharesCount}</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1A1D24] text-[#7B8291] text-xs">
            <Eye className="w-3.5 h-3.5" />
            <span className="font-medium text-xs">{post.stats.views}</span>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showCommentsSection && (
        <div className="px-3 py-3 border-t border-[rgba(255,255,255,0.05)] bg-gradient-to-b from-[#1A1D24] to-[#14161B]">
          <div className="space-y-3 max-h-64 overflow-y-auto mb-3">
            {comments.map((comment) => {
              const isCommentOwner = comment.user_id === (user?.id || currentUserId)
              const isPostOwner = post.user_id === (user?.id || currentUserId)
              const canDelete = isCommentOwner || isPostOwner

              return (
                <div key={comment.id} className="space-y-2">
                  {/* Comentario principal */}
                  <div className="flex gap-2 p-2 rounded-lg bg-[#14161B]/50 hover:bg-[#14161B] transition-colors">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[#FF2D2D] to-[#7F1D1D] flex-shrink-0 ring-1 ring-[rgba(255,255,255,0.1)]">
                      {comment.author.avatar ? (
                        <SafeImage
                          src={comment.author.avatar}
                          alt={comment.author.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                          {comment.author.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed">
                        <span className="font-semibold text-[#F8FAFC]">{comment.author.name}</span>
                        {' '}
                        <span className="text-[#A7AFBE]">{comment.content}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-xs text-[#7B8291]">{formatTimeAgo(comment.created_at)}</p>
                        {user && (
                          <>
                            <button
                              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                              className="text-xs text-[#7B8291] hover:text-[#FF2D2D] transition-colors flex items-center gap-1"
                            >
                              <Reply className="w-3 h-3" />
                              Responder
                            </button>
                            <button
                              onClick={() => handleLikeComment(comment.id, comment.user_liked || false)}
                              className={cn(
                                "text-xs flex items-center gap-1 transition-colors",
                                comment.user_liked
                                  ? "text-[#EF4444]"
                                  : "text-[#7B8291] hover:text-[#EF4444]"
                              )}
                            >
                              <Heart className={cn("w-3 h-3", comment.user_liked && "fill-current")} />
                              {comment.likes_count || 0}
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-xs text-[#EF4444] hover:text-[#FF6B6B] transition-colors"
                              >
                                Eliminar
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Respuestas */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-6 space-y-2 border-l-2 border-[rgba(255,255,255,0.05)] pl-3">
                      {comment.replies.map((reply: any) => {
                        const isReplyOwner = reply.user_id === (user?.id || currentUserId)
                        const canDeleteReply = isReplyOwner || isPostOwner

                        return (
                          <div key={reply.id} className="flex gap-2 p-2 rounded-lg bg-[#0A0A0B]/50 hover:bg-[#0A0A0B] transition-colors">
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-[#FF2D2D] to-[#7F1D1D] flex-shrink-0 ring-1 ring-[rgba(255,255,255,0.1)]">
                              {reply.author.avatar ? (
                                <SafeImage
                                  src={reply.author.avatar}
                                  alt={reply.author.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">
                                  {reply.author.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs leading-relaxed">
                                <span className="font-semibold text-[#F8FAFC]">{reply.author.name}</span>
                                {' '}
                                <span className="text-[#A7AFBE]">{reply.content}</span>
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-[10px] text-[#7B8291]">{formatTimeAgo(reply.created_at)}</p>
                                {user && (
                                  <>
                                    <button
                                      onClick={() => handleLikeComment(reply.id, reply.user_liked || false)}
                                      className={cn(
                                        "text-[10px] flex items-center gap-1 transition-colors",
                                        reply.user_liked
                                          ? "text-[#EF4444]"
                                          : "text-[#7B8291] hover:text-[#EF4444]"
                                      )}
                                    >
                                      <Heart className={cn("w-3 h-3", reply.user_liked && "fill-current")} />
                                      {reply.likes_count || 0}
                                    </button>
                                    {canDeleteReply && (
                                      <button
                                        onClick={() => handleDeleteComment(reply.id)}
                                        className="text-[10px] text-[#EF4444] hover:text-[#FF6B6B] transition-colors"
                                      >
                                        Eliminar
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Input para responder */}
                  {replyingTo === comment.id && (
                    <div className="ml-6 flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handlePostComment(comment.id)}
                        placeholder={`Responder a ${comment.author.name}...`}
                        className="flex-1 px-2 py-1.5 bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#F8FAFC] text-xs placeholder-[#7B8291] focus:outline-none focus:border-[#FF2D2D] focus:ring-1 focus:ring-[#FF2D2D]/20 transition-all"
                      />
                      <button
                        onClick={() => handlePostComment(comment.id)}
                        disabled={!replyText.trim() || postingComment}
                        className="px-3 py-1.5 bg-[#FF2D2D] text-white rounded-lg text-xs font-semibold hover:bg-[#FF3D3D] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {postingComment ? '...' : 'Enviar'}
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(null)
                          setReplyText('')
                        }}
                        className="px-3 py-1.5 text-[#7B8291] hover:text-[#F8FAFC] transition-colors text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
              placeholder="Escribe un comentario..."
              className="flex-1 px-3 py-2 bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#F8FAFC] text-xs placeholder-[#7B8291] focus:outline-none focus:border-[#FF2D2D] focus:ring-1 focus:ring-[#FF2D2D]/20 transition-all"
            />
            <button
              onClick={() => handlePostComment()}
              disabled={!newComment.trim() || postingComment}
              className="px-4 py-2 bg-[#FF2D2D] text-white rounded-lg text-xs font-semibold hover:bg-[#FF3D3D] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {postingComment ? '...' : 'Publicar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

