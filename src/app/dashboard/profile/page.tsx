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
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddProgressModal } from './AddProgressModal'
import { AddPhotoModal } from './AddPhotoModal'
import { useToast, ToastContainer } from '@/app/_components/Toast'

type UserProfile = {
  id?: string
  full_name?: string
  preferred_name?: string
  avatar_url?: string
  email?: string
  height_cm?: number
  weight_kg?: number
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

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    preferred_name: '',
    height_cm: '',
    weight_kg: '',
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
      loadProfile()
      loadProgress()
    }
  }, [user])

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
          goal: formData.goal,
          sex: formData.sex
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        setEditing(false)
        
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
        toast.error('Error: El bucket "avatars" no existe. Por favor, ejecuta el script create-storage-buckets.sql en Supabase.')
        return
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
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-[#F8FAFC]">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const displayName = profile?.preferred_name || profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Usuario'

  return (
    <DashboardLayout activeSection="profile">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-heading text-3xl font-bold text-[#F8FAFC]">Mi Perfil</h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Profile Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Avatar Card */}
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6">
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="w-32 h-32 rounded-full object-cover border-4 border-[#FF2D2D]"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-4xl border-4 border-[#FF2D2D]">
                        {displayName[0]?.toUpperCase()}
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 p-2 bg-[#FF2D2D] rounded-full cursor-pointer hover:bg-[#FF3D3D] transition-colors">
                      <Camera className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-[#F8FAFC] mb-1">
                    {displayName}
                  </h3>
                  <p className="text-sm text-[#A7AFBE]">{user.email}</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6">
                <h4 className="font-heading text-lg font-bold text-[#F8FAFC] mb-4">Estadísticas</h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[#A7AFBE] mb-1">Peso actual</p>
                    <p className="text-2xl font-heading font-bold text-[#FF2D2D]">
                      {profile?.weight_kg ? `${profile.weight_kg} kg` : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#A7AFBE] mb-1">Altura</p>
                    <p className="text-2xl font-heading font-bold text-[#F8FAFC]">
                      {profile?.height_cm ? `${profile.height_cm} cm` : '--'}
                    </p>
                  </div>
                  {profile?.height_cm && profile?.weight_kg && (
                    <div>
                      <p className="text-sm text-[#A7AFBE] mb-1">IMC</p>
                      <p className="text-2xl font-heading font-bold text-[#F8FAFC]">
                        {(profile.weight_kg / ((profile.height_cm / 100) ** 2)).toFixed(1)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Info */}
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6">
                <h4 className="font-heading text-lg font-bold text-[#F8FAFC] mb-4">Información Personal</h4>
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
                    <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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

              {/* Progress Tracking */}
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-heading text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#FF2D2D]" />
                    Seguimiento de Progreso
                  </h4>
                  <button
                    onClick={() => setShowProgressModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir registro
                  </button>
                </div>
                {progressEntries.length > 0 ? (
                  <div className="space-y-3">
                    {progressEntries.slice(0, 5).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-[12px]"
                      >
                        <div className="flex items-center gap-4">
                          <Calendar className="w-5 h-5 text-[#FF2D2D]" />
                          <div>
                            <p className="text-sm text-[#F8FAFC] font-medium">
                              {new Date(entry.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            {entry.notes && (
                              <p className="text-xs text-[#A7AFBE] mt-1">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                        {entry.weight_kg && (
                          <div className="text-right">
                            <p className="text-lg font-heading font-bold text-[#FF2D2D]">
                              {entry.weight_kg} kg
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                    {progressEntries.length > 5 && (
                      <p className="text-sm text-[#7B8291] text-center">
                        Y {progressEntries.length - 5} registros más...
                      </p>
                    )}
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

              {/* Progress Photos */}
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-heading text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#FF2D2D]" />
                    Fotos de Progreso
                  </h4>
                  <button
                    onClick={() => setShowPhotoUpload(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Subir foto
                  </button>
                </div>
                {progressPhotos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {progressPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative aspect-square rounded-[12px] overflow-hidden bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] group"
                      >
                        <img
                          src={photo.photo_url}
                          alt={`Progreso ${new Date(photo.date).toLocaleDateString('es-ES')}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="text-center text-white text-xs">
                            <p>{new Date(photo.date).toLocaleDateString('es-ES')}</p>
                            {photo.photo_type && (
                              <p className="text-[#FF2D2D] capitalize mt-1">{photo.photo_type}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
              </div>

              {/* Posts Section */}
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6">
                <h4 className="font-heading text-lg font-bold text-[#F8FAFC] mb-4">Publicaciones</h4>
                <div className="text-center py-12">
                  <p className="text-[#A7AFBE] mb-2">Próximamente</p>
                  <p className="text-sm text-[#7B8291]">
                    Comparte tu progreso, logros y experiencias con la comunidad
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddProgressModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        onSuccess={() => {
          loadProgress()
          loadProfile() // Also reload profile to update weight if it was today's date
          setShowProgressModal(false)
        }}
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
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </DashboardLayout>
  )
}
