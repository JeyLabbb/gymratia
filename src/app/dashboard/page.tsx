'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { personas } from '@/lib/personas'
import Link from 'next/link'
import { 
  MessageCircle, 
  User, 
  Dumbbell, 
  UtensilsCrossed,
  TrendingUp,
  Target,
  Award,
  Calendar,
  ArrowRight,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardLayout } from '@/app/_components/DashboardLayout'
import { LoadingScreen } from '@/app/_components/LoadingScreen'
import SafeImage from '@/app/_components/SafeImage'
import { TrainerChatLink } from '@/app/_components/TrainerChatLink'

type TrainerChat = {
  id: string
  trainer_slug: 'edu' | 'carolina'
  created_at: string
  updated_at: string
  last_message_at?: string
}

type UserProfile = {
  weight_kg?: number
  height_cm?: number
  goal?: string
  preferred_name?: string
  full_name?: string
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<TrainerChat[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [trainerAvatars, setTrainerAvatars] = useState<Record<string, string>>({})

  useEffect(() => {
    console.log('[Dashboard] auth state:', { authLoading, hasUser: !!user })
    if (!authLoading && !user) {
      console.log('[Dashboard] no user -> redirect to login')
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    console.log('[Dashboard] effect run:', { user: !!user, authLoading })
    if (user) {
      console.log('[Dashboard] user exists -> loading data, setLoading(true)')
      setLoading(true)
      loadChats()
      loadProfile()
      loadTrainerAvatars()
    } else if (!authLoading) {
      console.log('[Dashboard] no user + auth done -> setLoading(false)')
      setLoading(false)
    }
  }, [user, authLoading])

  const loadTrainerAvatars = async () => {
    try {
      const activeTrainers = personas.filter(t => t.is_active !== false)
      const avatars: Record<string, string> = {}
      
      for (const trainer of activeTrainers) {
        try {
          // Buscar avatar con el slug del trainer (jey, edu, carolina son separados)
          const { data: trainerData } = await supabase
            .from('trainers')
            .select('avatar_url')
            .eq('slug', trainer.slug)
            .maybeSingle()
          
          if (trainerData?.avatar_url) {
            avatars[trainer.slug] = trainerData.avatar_url
          }
        } catch (error) {
          console.error(`Error loading avatar for ${trainer.slug}:`, error)
        }
      }
      
      console.log('Loaded trainer avatars:', avatars) // Debug
      setTrainerAvatars(avatars)
    } catch (error) {
      console.error('Error loading trainer avatars:', error)
    }
  }

  const loadChats = async () => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/chat', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setChats(data.chats || [])
      }
    } catch (error) {
      console.error('Error loading chats:', error)
    }
  }

  const loadProfile = async () => {
    console.log('[Dashboard] loadProfile called, user:', !!user)
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[Dashboard] loadProfile session:', !!session)
      if (!session) return

      console.log('[Dashboard] loadProfile fetching /api/user/profile...')
      const response = await fetch('/api/user/profile', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      console.log('[Dashboard] loadProfile response:', response.status)
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('[Dashboard] loadProfile error:', error)
    } finally {
      console.log('[Dashboard] loadProfile done -> setLoading(false)')
      setLoading(false)
    }
  }

  console.log('[Dashboard] render check:', { authLoading, loading, hasUser: !!user })
  if (authLoading || loading) {
    console.log('[Dashboard] -> LoadingScreen')
    return <LoadingScreen />
  }

  if (!user) {
    console.log('[Dashboard] -> null (no user)')
    return null
  }

  const getTrainerChat = (slug: 'edu' | 'carolina' | 'jey') => {
    return chats.find((c) => c.trainer_slug === slug)
  }

  const displayName = profile?.preferred_name || profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario'
  const hasActivePlan = profile?.goal && profile?.weight_kg && profile?.height_cm
  const activeTrainers = chats.length

  return (
    <DashboardLayout activeSection="dashboard">
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          {/* Welcome Header - compact on mobile */}
          <div className="bg-gradient-to-r from-[#FF2D2D]/10 to-[#FF2D2D]/5 border border-[#FF2D2D]/20 rounded-[12px] sm:rounded-[22px] p-3 sm:p-6">
            <h1 className="font-heading text-lg sm:text-3xl font-bold text-[#F8FAFC] mb-0.5 sm:mb-2">
              ¡Hola, {displayName}! 👋
            </h1>
            <p className="text-xs sm:text-base text-[#A7AFBE] hidden sm:block">
              Continúa tu transformación. Aquí tienes un resumen de tu progreso.
            </p>
          </div>

          {/* Stats - mini-cards grid on mobile (2-3 per row) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-6">
            <Link
              href="/dashboard/profile"
              className={cn(
                "rounded-[12px] sm:rounded-[22px] p-3 sm:p-6 hover:border-[#FF2D2D]/50 transition-all group",
                "bg-[#14161B] border border-[rgba(255,255,255,0.08)]",
                "hover:shadow-[0_0_40px_rgba(255,45,45,0.15)]"
              )}
            >
              <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF2D2D]/30 transition-colors">
                  <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-[#FF2D2D]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base sm:text-2xl font-heading font-bold text-[#F8FAFC] truncate">
                    {profile?.weight_kg ? `${profile.weight_kg} kg` : '--'}
                  </p>
                  <p className="text-[10px] sm:text-sm text-[#A7AFBE] truncate">Peso</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-[#FF2D2D] group-hover:gap-3 transition-all">
                <span className="truncate">Progreso</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              </div>
            </Link>

            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6 text-[#FF2D2D]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base sm:text-2xl font-heading font-bold text-[#F8FAFC]">{activeTrainers}</p>
                  <p className="text-[10px] sm:text-sm text-[#A7AFBE] truncate">Entrenadores</p>
                </div>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center flex-shrink-0">
                  {hasActivePlan ? (
                    <Award className="w-4 h-4 sm:w-6 sm:h-6 text-[#FF2D2D]" />
                  ) : (
                    <Target className="w-4 h-4 sm:w-6 sm:h-6 text-[#A7AFBE]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base sm:text-2xl font-heading font-bold text-[#F8FAFC] truncate">
                    {hasActivePlan ? 'Activo' : 'Pendiente'}
                  </p>
                  <p className="text-[10px] sm:text-sm text-[#A7AFBE] truncate">Plan entreno</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trainers Section - compact on mobile */}
          <div>
            <div className="flex items-center justify-between mb-3 sm:mb-6">
              <h2 className="font-heading text-base sm:text-2xl font-bold text-[#F8FAFC]">Mis Entrenadores</h2>
              <Link
                href="/trainers"
                className="text-xs sm:text-sm text-[#FF2D2D] hover:text-[#FF3D3D] transition-colors flex items-center gap-1"
              >
                <span className="hidden sm:inline">Ver todos</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-6">
              {personas.filter(t => t.is_active !== false).map((trainer) => {
                const chat = getTrainerChat(trainer.slug as 'edu' | 'carolina' | 'jey')
                const trainerAvatar = trainerAvatars[trainer.slug]
                return (
                  <TrainerChatLink
                    key={trainer.slug}
                    trainerSlug={trainer.slug}
                    trainerName={trainer.name}
                    variant="link"
                    className="block bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-3 sm:p-6 hover:border-[#FF2D2D]/50 transition-all group"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {trainerAvatar ? (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-[#FF2D2D] flex-shrink-0">
                          <SafeImage
                            src={trainerAvatar}
                            alt={trainer.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-lg sm:text-2xl flex-shrink-0">
                          {trainer.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-heading text-base sm:text-xl font-bold text-[#F8FAFC] truncate">
                            {trainer.name}
                          </h3>
                          {chat && (
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#FF2D2D] animate-pulse flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-[#A7AFBE] mb-2 line-clamp-2">{trainer.headline}</p>
                        {chat ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-[#7B8291]" />
                            <p className="text-xs text-[#7B8291]">
                              Última conversación:{' '}
                              {new Date(chat.last_message_at || chat.updated_at).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-[#FF2D2D] flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Inicia una conversación
                          </p>
                        )}
                      </div>
                      <MessageCircle className="w-6 h-6 text-[#FF2D2D] group-hover:scale-110 transition-transform" />
                    </div>
                  </TrainerChatLink>
                )
              })}
            </div>
          </div>

          {/* Quick Actions - mini-cards grid on mobile */}
          <div>
            <h2 className="font-heading text-base sm:text-2xl font-bold text-[#F8FAFC] mb-3 sm:mb-6">Accesos Rápidos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-6">
              <Link
                href="/dashboard/profile"
                className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-3 sm:p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
              >
                <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF2D2D]/30 transition-colors">
                    <User className="w-4 h-4 sm:w-6 sm:h-6 text-[#FF2D2D]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-sm sm:text-lg font-bold text-[#F8FAFC] truncate">Perfil</h3>
                    <p className="text-[10px] sm:text-xs text-[#A7AFBE] hidden sm:block">Datos y progreso</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-sm text-[#FF2D2D] group-hover:gap-3 transition-all">
                  <span>Ver</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                </div>
              </Link>

              <Link
                href="/dashboard/workouts"
                className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-3 sm:p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
              >
                <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF2D2D]/30 transition-colors">
                    <Dumbbell className="w-4 h-4 sm:w-6 sm:h-6 text-[#FF2D2D]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-sm sm:text-lg font-bold text-[#F8FAFC] truncate">Entrenos</h3>
                    <p className="text-[10px] sm:text-xs text-[#A7AFBE] hidden sm:block">Rutinas y planes</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-sm text-[#FF2D2D] group-hover:gap-3 transition-all">
                  <span>Ver</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                </div>
              </Link>

              <Link
                href="/dashboard/diet"
                className="col-span-2 md:col-span-1 bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-3 sm:p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
              >
                <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF2D2D]/30 transition-colors">
                    <UtensilsCrossed className="w-4 h-4 sm:w-6 sm:h-6 text-[#FF2D2D]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-sm sm:text-lg font-bold text-[#F8FAFC] truncate">Dieta</h3>
                    <p className="text-[10px] sm:text-xs text-[#A7AFBE] hidden sm:block">Nutrición</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-sm text-[#FF2D2D] group-hover:gap-3 transition-all">
                  <span>Ver</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
