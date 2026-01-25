"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, UserMinus, Settings } from 'lucide-react'
import PostCard from '@/app/_components/PostCard'
import PostPreview from '@/app/_components/PostPreview'
import SafeImage from '@/app/_components/SafeImage'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'

type UserProfile = {
  id: string
  user_id: string
  full_name?: string
  avatar_url?: string
  is_trainer: boolean
  trainer_name?: string
  description?: string
  specialty?: string
}

type Post = {
  id: string
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

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const userId = params.userId as string
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [postsCount, setPostsCount] = useState(0)

  useEffect(() => {
    if (userId) {
      loadProfile()
      loadPosts()
      checkFollowStatus()
      loadStats()
    }
  }, [userId, user])

  const loadProfile = async () => {
    try {
      // Intentar cargar como entrenador primero
      const { data: trainer } = await supabase
        .from('trainers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (trainer) {
        // Si es entrenador, redirigir inmediatamente a su perfil de entrenador
        if (trainer.slug) {
          router.replace(`/trainers/${trainer.slug}`)
          return
        }
        setProfile({
          id: trainer.id,
          user_id: trainer.user_id,
          full_name: trainer.full_name,
          avatar_url: trainer.avatar_url,
          is_trainer: true,
          trainer_name: trainer.trainer_name,
          description: trainer.description,
          specialty: trainer.specialty
        })
      } else {
        // Cargar como usuario normal
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()

        if (userProfile) {
          // Si es alumno y es el propio perfil, redirigir al dashboard
          if (user?.id === userId) {
            router.replace('/dashboard/profile')
            return
          }
          setProfile({
            id: userProfile.id,
            user_id: userProfile.user_id,
            full_name: userProfile.full_name,
            avatar_url: userProfile.avatar_url,
            is_trainer: false
          })
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPosts = async () => {
    try {
      const response = await fetch(`/api/social/posts?feed=user&userId=${userId}&limit=50`)
      const data = await response.json()
      if (data.posts) {
        setPosts(data.posts)
        setPostsCount(data.posts.length)
      }
    } catch (error) {
      console.error('Error loading posts:', error)
    }
  }

  const checkFollowStatus = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/social/follow?userId=${userId}`)
      const data = await response.json()
      setFollowing(data.following || false)
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const loadStats = async () => {
    try {
      // Seguidores
      const { count: followers } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)
      
      setFollowersCount(followers || 0)

      // Siguiendo
      const { count: following } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId)
      
      setFollowingCount(following || 0)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleFollow = async () => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    const newFollowing = !following
    setFollowing(newFollowing)

    try {
      const response = await fetch(
        `/api/social/follow?userId=${userId}&action=${newFollowing ? 'follow' : 'unfollow'}`,
        { method: 'POST' }
      )

      if (!response.ok) {
        setFollowing(!newFollowing) // Revertir
      } else {
        loadStats() // Actualizar contadores
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
      setFollowing(!newFollowing)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0F14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#A7AFBE]">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0D0F14] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#A7AFBE] text-lg mb-2">Usuario no encontrado</p>
          <button
            onClick={() => router.back()}
            className="text-[#3B82F6] hover:text-[#2563EB] transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  const isOwnProfile = user?.id === userId
  const displayName = profile.is_trainer ? profile.trainer_name : profile.full_name

  return (
    <div className="min-h-screen bg-[#0D0F14]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0D0F14]/80 backdrop-blur-lg border-b border-[rgba(255,255,255,0.08)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-[#1A1D24] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#A7AFBE]" />
            </button>
            <h1 className="text-xl font-bold text-[#F8FAFC]">{displayName}</h1>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[#1A1D24] flex-shrink-0">
              {profile.avatar_url ? (
                <SafeImage
                  src={profile.avatar_url}
                  alt={displayName || 'Usuario'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#A7AFBE] text-2xl font-medium">
                  {displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-[#F8FAFC]">{displayName}</h2>
                {profile.is_trainer && (
                  <span className="px-3 py-1 bg-[#3B82F6]/20 text-[#3B82F6] text-sm font-medium rounded-full">
                    Entrenador
                  </span>
                )}
                {profile.specialty && (
                  <span className="px-3 py-1 bg-[#1A1D24] text-[#A7AFBE] text-sm rounded-full">
                    {profile.specialty}
                  </span>
                )}
              </div>

              {profile.description && (
                <p className="text-[#A7AFBE] mb-4">{profile.description}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 mb-4">
                <div>
                  <span className="font-semibold text-[#F8FAFC]">{postsCount}</span>
                  <span className="text-[#7B8291] ml-1">publicaciones</span>
                </div>
                <div>
                  <span className="font-semibold text-[#F8FAFC]">{followersCount}</span>
                  <span className="text-[#7B8291] ml-1">seguidores</span>
                </div>
                <div>
                  <span className="font-semibold text-[#F8FAFC]">{followingCount}</span>
                  <span className="text-[#7B8291] ml-1">siguiendo</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {isOwnProfile ? (
                  <button
                    onClick={() => router.push(profile.is_trainer ? '/trainers/settings' : '/dashboard/profile')}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#A7AFBE] hover:bg-[#252932] transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Editar perfil
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    className={following
                      ? 'flex items-center gap-2 px-4 py-2 bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#A7AFBE] hover:bg-[#252932] transition-colors'
                      : 'flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-lg font-medium hover:bg-[#2563EB] transition-colors'
                    }
                  >
                    {following ? (
                      <>
                        <UserMinus className="w-4 h-4" />
                        Dejar de seguir
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Seguir
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div>
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Publicaciones</h3>
          {posts.length === 0 ? (
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-12 text-center">
              <p className="text-[#A7AFBE]">No hay publicaciones aún</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post) => (
                <PostPreview
                  key={post.id}
                  post={post}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

