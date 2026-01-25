"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Compass, Users, TrendingUp, Plus, ArrowLeft } from 'lucide-react'
import PostCard from '@/app/_components/PostCard'
import { CreatePostModal } from '@/app/_components/CreatePostModal'
import { useAuth } from '@/app/_components/AuthProvider'

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

export default function ExplorePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'explore' | 'following'>('explore')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sortBy, setSortBy] = useState<'viral' | 'recent'>('viral')

  useEffect(() => {
    loadPosts()
  }, [activeTab, sortBy, user])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const feedType = activeTab === 'following' ? 'following' : 'explore'
      const response = await fetch(
        `/api/social/posts?feed=${feedType}&sortBy=${sortBy}&limit=20`
      )
      
      if (!response.ok) {
        console.error('Error loading posts:', response.status, response.statusText)
        setPosts([])
        return
      }
      
      const data = await response.json()
      if (data.posts) {
        setPosts(data.posts)
      } else {
        setPosts([])
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const handlePostSuccess = () => {
    loadPosts()
  }

  const handleAuthorClick = (userId: string) => {
    if (userId) {
      router.push(`/user/${userId}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0B]/80 backdrop-blur-lg border-b border-[rgba(255,255,255,0.08)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-lg hover:bg-[#1A1D24] transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#A7AFBE]" />
              </button>
              <div className="flex items-center gap-3">
                <Compass className="w-6 h-6 text-[#FF2D2D]" />
                <h1 className="text-2xl font-heading font-bold text-[#F8FAFC]">Explorar</h1>
              </div>
            </div>
            {user && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FF2D2D] text-white rounded-lg font-semibold hover:bg-[#FF3D3D] transition-all shadow-lg shadow-[#FF2D2D]/30"
              >
                <Plus className="w-5 h-5" />
                Crear publicación
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('explore')}
              className={activeTab === 'explore'
                ? 'px-5 py-2.5 bg-[#FF2D2D] text-white rounded-lg font-semibold shadow-lg shadow-[#FF2D2D]/30'
                : 'px-5 py-2.5 text-[#A7AFBE] hover:text-[#F8FAFC] hover:bg-[#1A1D24] rounded-lg transition-all'
              }
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Explorar
              </div>
            </button>
            {user && (
              <button
                onClick={() => setActiveTab('following')}
                className={activeTab === 'following'
                  ? 'px-5 py-2.5 bg-[#FF2D2D] text-white rounded-lg font-semibold shadow-lg shadow-[#FF2D2D]/30'
                  : 'px-5 py-2.5 text-[#A7AFBE] hover:text-[#F8FAFC] hover:bg-[#1A1D24] rounded-lg transition-all'
                }
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Siguiendo
                </div>
              </button>
            )}
          </div>

          {/* Sort Options */}
          {activeTab === 'explore' && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-[#7B8291]">Ordenar por:</span>
              <button
                onClick={() => setSortBy('viral')}
                className={sortBy === 'viral'
                  ? 'px-4 py-1.5 bg-[#FF2D2D]/20 text-[#FF6B6B] rounded-lg text-sm font-semibold border border-[#FF2D2D]/30'
                  : 'px-4 py-1.5 text-[#A7AFBE] hover:text-[#F8FAFC] hover:bg-[#1A1D24] rounded-lg text-sm transition-all'
                }
              >
                Más viral
              </button>
              <button
                onClick={() => setSortBy('recent')}
                className={sortBy === 'recent'
                  ? 'px-4 py-1.5 bg-[#FF2D2D]/20 text-[#FF6B6B] rounded-lg text-sm font-semibold border border-[#FF2D2D]/30'
                  : 'px-4 py-1.5 text-[#A7AFBE] hover:text-[#F8FAFC] hover:bg-[#1A1D24] rounded-lg text-sm transition-all'
                }
              >
                Más reciente
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-[#FF2D2D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#A7AFBE] font-medium">Cargando publicaciones...</p>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center mx-auto mb-6">
                <Compass className="w-10 h-10 text-[#FF2D2D]" />
              </div>
              <p className="text-[#F8FAFC] text-xl font-semibold mb-2">
                {activeTab === 'following' 
                  ? 'No sigues a nadie aún' 
                  : 'No hay publicaciones aún'}
              </p>
              <p className="text-sm text-[#A7AFBE] mb-6">
                {activeTab === 'following'
                  ? 'Sigue a entrenadores y alumnos para ver sus publicaciones aquí'
                  : 'Sé el primero en compartir algo'}
              </p>
              {user && activeTab === 'explore' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-[#FF2D2D] text-white rounded-lg font-semibold hover:bg-[#FF3D3D] transition-all shadow-lg shadow-[#FF2D2D]/30"
                >
                  Crear primera publicación
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onAuthorClick={handleAuthorClick}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {user && (
        <CreatePostModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handlePostSuccess}
        />
      )}
    </div>
  )
}

