'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { DashboardLayout } from '@/app/_components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { 
  User, 
  Camera, 
  Save, 
  TrendingUp, 
  Image as ImageIcon,
  Edit2,
  X,
  Plus,
  Calendar,
  Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddProgressModal } from './AddProgressModal'
import { AddPhotoModal } from './AddPhotoModal'
import { EditPhotoModal } from './EditPhotoModal'
import { PhotoCarousel } from './PhotoCarousel'
import { useToast, ToastContainer } from '@/app/_components/Toast'
import { LoadingScreen } from '@/app/_components/LoadingScreen'
import { WeightProgressChart } from '@/app/_components/WeightProgressChart'
import PostCard from '@/app/_components/PostCard'
import PostPreview from '@/app/_components/PostPreview'
import { CreatePostModal } from '@/app/_components/CreatePostModal'

type UserProfile = {
  id?: string
  full_name?: string
  preferred_name?: string
  avatar_url?: string
  email?: string
  height_cm?: number
  weight_kg?: number
  target_weight_kg?: number
  goal?: string
  sex?: string
  created_at?: string
  updated_at?: string
}

type ProgressEntry = {
  id: string
  date: string
  weight_kg: number
  notes?: string
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([])
  const [progressPhotos, setProgressPhotos] = useState<any[]>([])
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState<any | null>(null)
  const [editingProgress, setEditingProgress] = useState<ProgressEntry | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [showCreatePostModal, setShowCreatePostModal] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    preferred_name: '',
    height_cm: '',
    weight_kg: '',
    target_weight_kg: '',
    goal: '',
    sex: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      // Cargar datos guardados de localStorage si existen
      if (typeof window !== 'undefined') {
        const savedFormData = localStorage.getItem('profile-edit-form')
        if (savedFormData) {
          try {
            const parsed = JSON.parse(savedFormData)
            setFormData(parsed)
          } catch (e) {
            console.error('Error cargando datos guardados:', e)
          }
        }
      }
      
      loadProfile()
      loadProgress()
      loadPosts()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])
  
  // Guardar formulario en localStorage cuando cambia
  useEffect(() => {
    if (user && formData && Object.keys(formData).length > 0) {
      localStorage.setItem('profile-edit-form', JSON.stringify(formData))
    }
  }, [formData, user])

  const loadPosts = async () => {
    if (!user) return
    setLoadingPosts(true)
    try {
      const response = await fetch(`/api/social/posts?feed=user&userId=${user.id}&limit=50`)
      const data = await response.json()
      if (data.posts) {
        setPosts(data.posts)
      }
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoadingPosts(false)
    }
  }

  const loadProfile = async () => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/user/profile', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const profileData = data.profile || {}
        console.log('Profile loaded:', profileData) // Debug log
        setProfile(profileData)
        setFormData({
          full_name: profileData.full_name || '',
          preferred_name: profileData.preferred_name || '',
          height_cm: profileData.height_cm?.toString() || '',
          weight_kg: profileData.weight_kg?.toString() || '',
          target_weight_kg: profileData.target_weight_kg?.toString() || '',
          goal: profileData.goal || '',
          sex: profileData.sex || ''
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error loading profile:', errorData)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProgress = async () => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Load progress entries
      const progressResponse = await fetch('/api/progress', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        setProgressEntries(progressData.progress || [])
      }

      // Load progress photos
      const photosResponse = await fetch('/api/progress-photos', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (photosResponse.ok) {
        const photosData = await photosResponse.json()
        setProgressPhotos(photosData.photos || [])
      }
    } catch (error) {
      console.error('Error loading progress:', error)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          preferred_name: formData.preferred_name,
          height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
          weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
          target_weight_kg: formData.target_weight_kg ? parseFloat(formData.target_weight_kg) : null,
          goal: formData.goal,
          sex: formData.sex
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        setEditing(false)
        
        // Limpiar datos guardados después de guardar exitosamente
        localStorage.removeItem('profile-edit-form')
        
        // Show success message with notification info
        if (data.message) {
          toast.success(data.message, 6000)
        } else {
          toast.success('Perfil actualizado correctamente', 4000)
        }

        // After 5 seconds, trigger trainer auto-message for all active trainers
        setTimeout(async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // Get all active trainer chats
            const chatsResponse = await fetch('/api/chat', {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            })

            if (chatsResponse.ok) {
              const chatsData = await chatsResponse.json()
              const activeChats = chatsData.chats || []

              // Trigger auto-message for each active trainer
              for (const chat of activeChats) {
                try {
                  await fetch('/api/trainer/auto-message', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                      trainerSlug: chat.trainer_slug,
                    }),
                  })
                } catch (error) {
                  console.error(`Error triggering auto-message for ${chat.trainer_slug}:`, error)
                }
              }
            }
          } catch (error) {
            console.error('Error triggering trainer messages:', error)
          }
        }, 5000) // 5 second delay
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(`Error: ${errorData.error || 'No se pudo actualizar el perfil'}`)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      // Store in user-specific folder
      const filePath = `${user.id}/${fileName}`

      // Check if bucket exists, if not show error
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      if (bucketsError) {
        console.error('Error checking buckets:', bucketsError)
        toast.error('Error: No se pudo acceder al almacenamiento. Por favor, asegúrate de que el bucket "avatars" existe en Supabase Storage.')
        return
      }

      const avatarsBucket = buckets?.find(b => b.id === 'avatars')
      if (!avatarsBucket) {
        // Try to create bucket automatically
        try {
          const setupResponse = await fetch('/api/storage/setup-bucket', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ bucketId: 'avatars' }),
          })

          const setupData = await setupResponse.json()

          if (!setupResponse.ok || setupData.manualSetupRequired) {
            toast.error('Error: El bucket "avatars" no existe. Por favor, ejecuta el script create-storage-buckets.sql en Supabase SQL Editor.')
            return
          }
          // Bucket created successfully, continue with upload
        } catch (setupError) {
          console.error('Error setting up bucket:', setupError)
          toast.error('Error: El bucket "avatars" no existe. Por favor, ejecuta el script create-storage-buckets.sql en Supabase.')
          return
        }
      }

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').slice(-2).join('/')
        await supabase.storage.from('avatars').remove([oldPath]).catch(() => {})
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          avatar_url: publicUrl
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error updating profile:', errorData)
        toast.error('Error al actualizar el perfil. Por favor, intenta de nuevo.')
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      toast.error(`Error al subir la foto: ${error.message || 'Error desconocido'}`)
    }
  }

  if (authLoading || loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return null
  }

  const displayName = profile?.preferred_name || profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Usuario'

  return (
    <DashboardLayout activeSection="profile">
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          {/* Header - compact on mobile */}
          <div className="flex items-center justify-between mb-3 sm:mb-8">
            <h2 className="font-heading text-lg sm:text-3xl font-bold text-[#F8FAFC]">Mi Perfil</h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-3 sm:gap-6">
            {/* Left Column - Profile Info */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-6">
              {/* Avatar Card - compact on mobile */}
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-3 sm:p-6">
                <div className="flex flex-col items-center">
                  <div className="relative mb-3 sm:mb-4">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="w-20 h-20 sm:w-32 sm:h-32 rounded-full object-cover border-2 sm:border-4 border-[#FF2D2D]"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-2xl sm:text-4xl border-2 sm:border-4 border-[#FF2D2D]">
                        {displayName[0]?.toUpperCase()}
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 p-1.5 sm:p-2 bg-[#FF2D2D] rounded-full cursor-pointer hover:bg-[#FF3D3D] transition-colors">
                      <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <h3 className="font-heading text-base sm:text-xl font-bold text-[#F8FAFC] mb-1">
                    {displayName}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A7AFBE] truncate">{user.email}</p>
                </div>
              </div>

              {/* Quick Stats - mini-cards on mobile */}
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-3 sm:p-6">
                <h4 className="font-heading text-sm sm:text-lg font-bold text-[#F8FAFC] mb-3 sm:mb-4">Estadísticas</h4>
                <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-col sm:gap-4">
                  <div className="p-2 sm:p-0 rounded-[8px] sm:rounded-none bg-[#1A1D24]/50 sm:bg-transparent">
                    <p className="text-[10px] sm:text-sm text-[#A7AFBE] mb-0.5 sm:mb-1">Peso</p>
                    <p className="text-base sm:text-2xl font-heading font-bold text-[#FF2D2D]">
                      {profile?.weight_kg ? `${profile.weight_kg}` : '--'}
                    </p>
                  </div>
                  <div className="p-2 sm:p-0 rounded-[8px] sm:rounded-none bg-[#1A1D24]/50 sm:bg-transparent">
                    <p className="text-[10px] sm:text-sm text-[#A7AFBE] mb-0.5 sm:mb-1">Altura</p>
                    <p className="text-base sm:text-2xl font-heading font-bold text-[#F8FAFC]">
                      {profile?.height_cm ? `${profile.height_cm}` : '--'}
                    </p>
                  </div>
                  {profile?.height_cm && profile?.weight_kg && (
                    <div className="p-2 sm:p-0 rounded-[8px] sm:rounded-none bg-[#1A1D24]/50 sm:bg-transparent">
                      <p className="text-[10px] sm:text-sm text-[#A7AFBE] mb-0.5 sm:mb-1">IMC</p>
                      <p className="text-base sm:text-2xl font-heading font-bold text-[#F8FAFC]">
                        {(profile.weight_kg / ((profile.height_cm / 100) ** 2)).toFixed(1)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mi Feed - compact on mobile */}
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-3 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h4 className="font-heading text-base sm:text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF2D2D]" />
                    Mi Feed
                  </h4>
                  <button
                    onClick={() => setShowCreatePostModal(true)}
                    className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-[10px] sm:rounded-[12px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors text-xs sm:text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Publicar
                  </button>
                </div>
                {loadingPosts ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-[#FF2D2D] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-[#A7AFBE] mb-4">No has publicado nada aún</p>
                    <button
                      onClick={() => setShowCreatePostModal(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-[#FF2D2D] text-white rounded-lg font-medium hover:bg-[#FF3D3D] transition-colors mx-auto"
                    >
                      <Plus className="w-5 h-5" />
                      Crear primera publicación
                    </button>
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

            {/* Right Column - Main Content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Personal Info - Edit button next to section */}
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-heading text-base sm:text-lg font-bold text-[#F8FAFC]">Información Personal</h4>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-[10px] sm:rounded-[12px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors text-xs sm:text-sm"
                    >
                      <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Editar
                    </button>
                  )}
                </div>
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-[#A7AFBE] mb-2">Nombre completo</label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-4 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                        placeholder="Tu nombre completo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#A7AFBE] mb-2">
                        Nombre preferido <span className="text-xs">(como te llaman los entrenadores)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.preferred_name}
                        onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
                        className="w-full px-4 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                        placeholder="Ej: Juan, María..."
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-[#A7AFBE] mb-2">Altura (cm)</label>
                        <input
                          type="number"
                          value={formData.height_cm}
                          onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                          className="w-full px-4 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                          placeholder="175"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#A7AFBE] mb-2">Peso (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.weight_kg}
                          onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                          className="w-full px-4 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                          placeholder="75.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#A7AFBE] mb-2">Peso objetivo (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.target_weight_kg}
                          onChange={(e) => setFormData({ ...formData, target_weight_kg: e.target.value })}
                          className="w-full px-4 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                          placeholder="Ej: 70"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[#A7AFBE] mb-2">Sexo</label>
                      <select
                        value={formData.sex}
                        onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                        className="w-full px-4 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                      >
                        <option value="">Seleccionar</option>
                        <option value="male">Masculino</option>
                        <option value="female">Femenino</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-[#A7AFBE] mb-2">Objetivo</label>
                      <textarea
                        value={formData.goal}
                        onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                        className="w-full px-4 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] resize-none"
                        rows={3}
                        placeholder="Ej: Ganar músculo y perder grasa, mejorar mi fuerza, mantenerme en forma..."
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 rounded-[12px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => {
                          setEditing(false)
                          loadProfile()
                        }}
                        className="px-6 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] hover:bg-[#14161B] transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-sm text-[#A7AFBE] mb-1">Nombre completo</p>
                        <p className="text-[#F8FAFC]">{profile?.full_name || '--'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#A7AFBE] mb-1">Nombre preferido</p>
                        <p className="text-[#F8FAFC]">{profile?.preferred_name || '--'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#A7AFBE] mb-1">Altura</p>
                        <p className="text-[#F8FAFC]">{profile?.height_cm ? `${profile.height_cm} cm` : '--'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#A7AFBE] mb-1">Peso</p>
                        <p className="text-[#F8FAFC]">{profile?.weight_kg ? `${profile.weight_kg} kg` : '--'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#A7AFBE] mb-1">Peso objetivo</p>
                        <p className="text-[#F8FAFC]">{profile?.target_weight_kg ? `${profile.target_weight_kg} kg` : '--'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#A7AFBE] mb-1">Sexo</p>
                        <p className="text-[#F8FAFC]">
                          {profile?.sex === 'male' ? 'Masculino' : profile?.sex === 'female' ? 'Femenino' : profile?.sex || '--'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-[#A7AFBE] mb-1">Objetivo</p>
                        <p className="text-[#F8FAFC] whitespace-pre-wrap">
                          {profile?.goal || '--'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Photos */}
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h4 className="font-heading text-base sm:text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF2D2D]" />
                    Fotos
                  </h4>
                  <button
                    onClick={() => setShowPhotoUpload(true)}
                    className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-[10px] sm:rounded-[12px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors text-xs sm:text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Subir foto
                  </button>
                </div>
                {progressPhotos.length > 0 ? (
                  <PhotoCarousel photos={progressPhotos} onPhotoClick={(photo) => setEditingPhoto(photo)} />
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] flex items-center justify-center"
                      >
                        <ImageIcon className="w-8 h-8 text-[#7B8291]" />
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-[#7B8291] mt-4 text-center">
                  {progressPhotos.length === 0
                    ? 'Sube fotos de tu progreso para ver tu transformación'
                    : `${progressPhotos.length} foto${progressPhotos.length !== 1 ? 's' : ''} de progreso`}
                </p>
                {progressPhotos.length > 0 && (
                  <p className="text-xs text-[#7B8291] mt-2 text-center">
                    Haz clic en una foto para editarla o eliminarla
                  </p>
                )}
              </div>

              {/* Progress Tracking */}
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h4 className="font-heading text-base sm:text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF2D2D]" />
                    <span className="hidden sm:inline">Seguimiento de Progreso</span>
                    <span className="sm:hidden">Progreso</span>
                  </h4>
                  <button
                    onClick={() => setShowProgressModal(true)}
                    className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-[10px] sm:rounded-[12px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors text-xs sm:text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir registro
                  </button>
                </div>
                {progressEntries.length > 0 ? (
                  <div className="space-y-4">
                    {/* Target reached congratulation */}
                    {profile?.target_weight_kg != null && profile.target_weight_kg > 0 && (() => {
                      const weights = progressEntries.filter(e => e.weight_kg).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      const latestWeight = weights[0]?.weight_kg
                      const hasReached = latestWeight != null && Math.abs(latestWeight - profile.target_weight_kg) <= 0.5
                      return hasReached ? (
                        <div className="p-4 rounded-[16px] bg-gradient-to-r from-[#22C55E]/20 to-[#16A34A]/10 border-2 border-[#22C55E]/50 flex items-center gap-4">
                          <div className="p-3 rounded-[12px] bg-[#22C55E]/30">
                            <Trophy className="w-8 h-8 text-[#22C55E]" />
                          </div>
                          <div>
                            <h4 className="font-heading text-lg font-bold text-[#F8FAFC]">
                              ¡Objetivo alcanzado! 🎉
                            </h4>
                            <p className="text-sm text-[#A7AFBE]">
                              Has llegado a tu peso objetivo de {profile.target_weight_kg} kg. ¡Enhorabuena por tu constancia!
                            </p>
                          </div>
                        </div>
                      ) : null
                    })()}
                    {/* Weight Progress Chart */}
                    <div className="bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4">
                      <h5 className="text-sm font-semibold text-[#F8FAFC] mb-4">Evolución del Peso</h5>
                      <WeightProgressChart 
                        entries={progressEntries.filter(e => e.weight_kg)} 
                        targetWeightKg={profile?.target_weight_kg}
                      />
                    </div>
                    
                    {/* Recent Entries */}
                    <div className="space-y-3">
                      <h5 className="text-sm font-semibold text-[#F8FAFC]">Registros Recientes</h5>
                      {progressEntries.slice(0, 5).map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-4 bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-[12px] group hover:border-[rgba(255,255,255,0.12)] transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <Calendar className="w-5 h-5 text-[#FF2D2D]" />
                            <div className="flex-1">
                              <p className="text-sm text-[#F8FAFC] font-medium">
                                {new Date(entry.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                              {entry.notes && (
                                <p className="text-xs text-[#A7AFBE] mt-1">{entry.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {entry.weight_kg && (
                              <div className="text-right">
                                <p className="text-lg font-heading font-bold text-[#FF2D2D]">
                                  {entry.weight_kg} kg
                                </p>
                              </div>
                            )}
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingProgress(entry)
                                  setShowProgressModal(true)
                                }}
                                className="p-2 hover:bg-[#14161B] rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4 text-[#A7AFBE]" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm('¿Estás seguro de que quieres eliminar este registro?')) {
                                    try {
                                      const { data: { session } } = await supabase.auth.getSession()
                                      if (!session) return

                                      const response = await fetch(`/api/progress?id=${entry.id}`, {
                                        method: 'DELETE',
                                        headers: {
                                          Authorization: `Bearer ${session.access_token}`,
                                        },
                                      })

                                      if (response.ok) {
                                        toast.success('Registro eliminado correctamente')
                                        loadProgress()
                                      } else {
                                        const error = await response.json()
                                        toast.error(error.error || 'Error al eliminar el registro')
                                      }
                                    } catch (error: any) {
                                      console.error('Error deleting progress:', error)
                                      toast.error('Error al eliminar el registro')
                                    }
                                  }
                                }}
                                className="p-2 hover:bg-[#14161B] rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <X className="w-4 h-4 text-[#EF4444]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {progressEntries.length > 5 && (
                        <p className="text-sm text-[#7B8291] text-center">
                          Y {progressEntries.length - 5} registros más...
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center border border-[rgba(255,255,255,0.08)] rounded-[12px] bg-[#1A1D24]">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 text-[#A7AFBE] mx-auto mb-2" />
                      <p className="text-[#A7AFBE]">No hay registros aún</p>
                      <p className="text-sm text-[#7B8291] mt-1">Añade tu primer registro de progreso</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onSuccess={() => {
          loadPosts()
          setShowCreatePostModal(false)
        }}
      />
      <AddProgressModal
        isOpen={showProgressModal}
        onClose={() => {
          setShowProgressModal(false)
          setEditingProgress(null)
        }}
        onSuccess={() => {
          loadProgress()
          loadProfile() // Also reload profile to update weight if it was today's date
          setShowProgressModal(false)
          setEditingProgress(null)
          toast.success(editingProgress ? 'Registro actualizado correctamente' : 'Registro añadido correctamente')
        }}
        existingEntry={editingProgress}
      />
      <AddPhotoModal
        isOpen={showPhotoUpload}
        onClose={() => setShowPhotoUpload(false)}
        onSuccess={() => {
          loadProgress()
          setShowPhotoUpload(false)
        }}
        userId={user?.id || ''}
      />
      <EditPhotoModal
        isOpen={editingPhoto !== null}
        onClose={() => setEditingPhoto(null)}
        onSuccess={() => {
          loadProgress()
          setEditingPhoto(null)
          toast.success('Foto actualizada correctamente')
        }}
        onDelete={() => {
          loadProgress()
          setEditingPhoto(null)
          toast.success('Foto eliminada correctamente')
        }}
        photo={editingPhoto}
        userId={user?.id || ''}
      />
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </DashboardLayout>
  )
}
