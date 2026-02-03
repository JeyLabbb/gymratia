'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'
import { LoadingScreen } from './LoadingScreen'
import { 
  ArrowRight, 
  TrendingUp, 
  Target, 
  Calendar,
  MessageCircle,
  Dumbbell,
  Flame,
  Award,
  Users,
  UtensilsCrossed,
  Compass
} from 'lucide-react'
import Link from 'next/link'
import { personas } from '@/lib/personas'
import HeroBackgroundVideo from './HeroBackgroundVideo'
import { TrainerChatLink } from './TrainerChatLink'
import { ProfileGuard } from './ProfileGuard'
import { AppFooter } from './AppFooter'

type UserProfile = {
  full_name?: string
  preferred_name?: string
  avatar_url?: string
  weight_kg?: number
  height_cm?: number
  goal?: string
}

type TrainerChat = {
  id: string
  trainer_slug: 'edu' | 'carolina'
  last_message_at?: string
}

export function EpicHomeAuthenticated() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [chats, setChats] = useState<TrainerChat[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMode, setCurrentMode] = useState<'student' | 'trainer'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('user_mode') as 'student' | 'trainer') || 'student'
    }
    return 'student'
  })

  // Sincronizar modo con localStorage y escuchar cambios
  useEffect(() => {
    const syncMode = () => {
      if (typeof window !== 'undefined') {
        const mode = (localStorage.getItem('user_mode') as 'student' | 'trainer') || 'student'
        setCurrentMode(mode)
      }
    }

    // Sincronizar al montar
    syncMode()

    // Escuchar cambios en localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_mode') {
        syncMode()
      }
    }

    // Escuchar cambios en la misma ventana (cuando se cambia el modo)
    const interval = setInterval(syncMode, 500)

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    console.log('[EpicHome] effect:', { hasUser: !!user, authLoading, currentMode })
    if (user && !authLoading) {
      console.log('[EpicHome] calling loadData...')
      loadData()
    } else {
      console.log('[EpicHome] skipping loadData -> setLoading(false)')
      setLoading(false)
    }
  }, [user, authLoading, currentMode])

  const [isTrainer, setIsTrainer] = useState(false)
  const [hasTrainerProfile, setHasTrainerProfile] = useState(false)
  const [trainerData, setTrainerData] = useState<any>(null)
  const [trainerStats, setTrainerStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalWorkouts: 0,
    totalDiets: 0
  })

  const loadData = async () => {
    console.log('[EpicHome] loadData started')
    if (!user) {
      console.log('[EpicHome] loadData: no user, setLoading(false)')
      setLoading(false)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[EpicHome] loadData session:', !!session)
      if (!session) {
        console.log('[EpicHome] loadData: no session, setLoading(false)')
        setLoading(false)
        return
      }

      // Verificar si es entrenador
      const { data: trainer } = await supabase
        .from('trainers')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (trainer) {
        setHasTrainerProfile(true)
        setTrainerData(trainer)
        
        // Solo cargar estadísticas si está en modo entrenador
        if (currentMode === 'trainer') {
          setIsTrainer(true)
          try {
            const statsRes = await fetch('/api/trainer/stats', {
              headers: { Authorization: `Bearer ${session.access_token}` }
            })
            if (statsRes.ok) {
              const statsData = await statsRes.json()
              const n = statsData.activeStudents ?? 0
              setTrainerStats({
                totalStudents: n,
                activeStudents: n,
                totalWorkouts: statsData.totalWorkouts ?? 0,
                totalDiets: statsData.totalDiets ?? 0
              })
            }
          } catch (err) {
            console.error('Error cargando estadísticas:', err)
          }
        } else {
          setIsTrainer(false)
        }
      } else {
        setHasTrainerProfile(false)
        setIsTrainer(false)
      }

      // Si está en modo alumno o no tiene perfil de entrenador, cargar datos de alumno
      if (currentMode === 'student' || !trainer) {
        // Load profile
        const profileResponse = await fetch('/api/user/profile', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setProfile(profileData.profile)
        }

        // Load chats
        const chatsResponse = await fetch('/api/chat', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (chatsResponse.ok) {
          const chatsData = await chatsResponse.json()
          setChats(chatsData.chats || [])
        }
      }
    } catch (error) {
      console.error('[EpicHome] loadData error:', error)
    } finally {
      console.log('[EpicHome] loadData done -> setLoading(false)')
      setLoading(false)
    }
  }

  console.log('[EpicHome] render:', { loading, authLoading })
  if (loading || authLoading) {
    console.log('[EpicHome] -> LoadingScreen')
    return <LoadingScreen />
  }

  // Verificar si tiene perfil para el modo actual
  if (currentMode === 'trainer' && !hasTrainerProfile) {
    return <ProfileGuard mode="trainer"><div /></ProfileGuard>
  }
  
  if (currentMode === 'student' && !profile) {
    return <ProfileGuard mode="student"><div /></ProfileGuard>
  }

  // Si está en modo entrenador Y tiene perfil de entrenador, mostrar contenido de entrenador
  if (currentMode === 'trainer' && hasTrainerProfile && trainerData) {
    const trainerName = trainerData.trainer_name || trainerData.full_name || 'Entrenador'
    return (
        <div className="min-h-screen bg-[#0A0A0B]">
          {/* Hero Section */}
          <section className="relative min-h-[100vh] md:min-h-[95vh] flex items-center overflow-hidden bg-black">
            <div className="absolute inset-0 z-0">
              <HeroBackgroundVideo src="/videos/GymRatiaBueno.mp4" mobileSrc="/videos/videomovil.mp4" />
              <div className="absolute inset-0 bg-black/60 pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 h-48 md:h-64 bg-gradient-to-b from-transparent to-[#0A0A0B] pointer-events-none" />
            </div>

            <div className="relative z-10 container mx-auto px-5 md:px-8 pt-20 pb-32 md:pb-40">
              <div className="max-w-4xl">
                <p className="text-xs tracking-[0.18em] text-[#A7AFBE] uppercase mb-4">
                  PANEL DE ENTRENADOR
                </p>
                <h1 className="font-heading text-[44px] md:text-[72px] leading-[0.95] font-black uppercase mb-6">
                  <span className="text-[#F8FAFC]">BIENVENIDO,</span><br />
                  <span className="text-[#FF2D2D]">{trainerName.toUpperCase()}</span>
                </h1>
                <p className="text-lg text-[#A7AFBE] max-w-[520px] mb-8">
                  Gestiona tu contenido, conecta con tus alumnos y alimenta a tu IA con tu metodología única.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/trainers/dashboard"
                    className="inline-flex items-center justify-center rounded-[16px] font-medium transition-all bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] shadow-[0_0_40px_rgba(255,45,45,0.25)] px-8 py-4 text-lg"
                  >
                    Ir a mi dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <Link
                    href={`/trainers/${trainerData.slug}`}
                    className="inline-flex items-center justify-center rounded-[16px] font-medium transition-all text-[#F8FAFC] hover:bg-[#14161B] border border-[rgba(255,255,255,0.08)] px-8 py-4 text-lg"
                  >
                    Ver mi perfil público
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-16 bg-[#0A0A0B]">
            <div className="container mx-auto px-5 md:px-8">
              <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
                <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#FF2D2D]" />
                    </div>
                    <div>
                      <p className="text-2xl font-heading font-bold text-[#F8FAFC]">{trainerStats.totalStudents}</p>
                      <p className="text-sm text-[#A7AFBE]">Total Alumnos</p>
                    </div>
                  </div>
                  <Link
                    href="/trainers/dashboard"
                    className="text-sm text-[#FF2D2D] hover:text-[#FF3D3D] transition-colors inline-flex items-center gap-1"
                  >
                    Ver alumnos <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#22C55E]/50 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#22C55E]/20 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-[#22C55E]" />
                    </div>
                    <div>
                      <p className="text-2xl font-heading font-bold text-[#F8FAFC]">{trainerStats.activeStudents}</p>
                      <p className="text-sm text-[#A7AFBE]">Alumnos Activos</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#38BDF8]/50 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#38BDF8]/20 flex items-center justify-center">
                      <Dumbbell className="w-6 h-6 text-[#38BDF8]" />
                    </div>
                    <div>
                      <p className="text-2xl font-heading font-bold text-[#F8FAFC]">{trainerStats.totalWorkouts}</p>
                      <p className="text-sm text-[#A7AFBE]">Entrenamientos</p>
                    </div>
                  </div>
                  <Link
                    href="/trainers/content/workouts"
                    className="text-sm text-[#38BDF8] hover:text-[#5BC0F8] transition-colors inline-flex items-center gap-1"
                  >
                    Gestionar <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FFB020]/50 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#FFB020]/20 flex items-center justify-center">
                      <UtensilsCrossed className="w-6 h-6 text-[#FFB020]" />
                    </div>
                    <div>
                      <p className="text-2xl font-heading font-bold text-[#F8FAFC]">{trainerStats.totalDiets}</p>
                      <p className="text-sm text-[#A7AFBE]">Planes de Dieta</p>
                    </div>
                  </div>
                  <Link
                    href="/trainers/content/diets"
                    className="text-sm text-[#FFB020] hover:text-[#FFC040] transition-colors inline-flex items-center gap-1"
                  >
                    Gestionar <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions Section */}
          <section className="py-16 bg-[#0A0A0B]">
            <div className="container mx-auto px-5 md:px-8">
              <h2 className="font-heading text-3xl font-bold text-[#F8FAFC] mb-8 text-center">
                Gestiona tu Contenido
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                <Link
                  href="/trainers/content/workouts"
                  className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center group-hover:bg-[#FF2D2D]/30 transition-colors">
                      <Dumbbell className="w-8 h-8 text-[#FF2D2D]" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Entrenamientos</h3>
                      <p className="text-xs text-[#A7AFBE]">Define tu metodología</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#A7AFBE]">Gestionar</span>
                    <ArrowRight className="w-5 h-5 text-[#FF2D2D] group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                <Link
                  href="/trainers/content/diets"
                  className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#22C55E]/50 transition-all hover:shadow-[0_0_40px_rgba(34,197,94,0.15)] group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-[#22C55E]/20 flex items-center justify-center group-hover:bg-[#22C55E]/30 transition-colors">
                      <UtensilsCrossed className="w-8 h-8 text-[#22C55E]" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Dietas</h3>
                      <p className="text-xs text-[#A7AFBE]">Enfoque nutricional</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#A7AFBE]">Gestionar</span>
                    <ArrowRight className="w-5 h-5 text-[#22C55E] group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                <Link
                  href={`/trainers/${trainerData.slug}`}
                  className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center group-hover:bg-[#FF2D2D]/30 transition-colors">
                      <Award className="w-8 h-8 text-[#FF2D2D]" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Mi Perfil</h3>
                      <p className="text-xs text-[#A7AFBE]">Perfil público</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#A7AFBE]">Ver perfil</span>
                    <ArrowRight className="w-5 h-5 text-[#FF2D2D] group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                <Link
                  href="/trainers/settings"
                  className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                      <Target className="w-8 h-8 text-[#FF2D2D]" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Configuración</h3>
                      <p className="text-xs text-[#A7AFBE]">Ajustes y preferencias</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#A7AFBE]">Ajustes</span>
                    <ArrowRight className="w-5 h-5 text-[#FF2D2D] group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                <Link
                  href="/explore"
                  className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#3B82F6]/50 transition-all hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-[#3B82F6]/20 flex items-center justify-center group-hover:bg-[#3B82F6]/30 transition-colors">
                      <Compass className="w-8 h-8 text-[#3B82F6]" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Explorar</h3>
                      <p className="text-xs text-[#A7AFBE]">Publicaciones y contenido</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#A7AFBE]">Explorar</span>
                    <ArrowRight className="w-5 h-5 text-[#3B82F6] group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </div>
            </div>
          </section>

          <AppFooter />
        </div>
      )
  }

  // Home para alumno (código original)
  const displayName = profile?.preferred_name || profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario'
  const activeTrainers = chats.length
  const hasActivePlan = profile?.goal && profile?.weight_kg && profile?.height_cm

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      {/* Hero Section - Epic Version */}
      <section className="relative min-h-[100vh] md:min-h-[95vh] flex items-center overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <HeroBackgroundVideo src="/videos/GymRatiaBueno.mp4" mobileSrc="/videos/videomovil.mp4" />
          <div className="absolute inset-0 bg-black/60 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-48 md:h-64 bg-gradient-to-b from-transparent to-[#0A0A0B] pointer-events-none" />
        </div>

        <div className="relative z-10 container mx-auto px-5 md:px-8 pt-20 pb-32 md:pb-40">
          <div className="max-w-4xl">
            <p className="text-xs tracking-[0.18em] text-[#A7AFBE] uppercase mb-4">
              BIENVENIDO DE VUELTA
            </p>
            <h1 className="font-heading text-[44px] md:text-[72px] leading-[0.95] font-black uppercase mb-6">
              <span className="text-[#F8FAFC]">HOLA,</span><br />
              <span className="text-[#FF2D2D]">{displayName.toUpperCase()}</span><br />
              <span className="text-[#F8FAFC]">CONTINÚA TU</span><br />
              <span className="text-[#FF2D2D]">TRANSFORMACIÓN</span>
            </h1>
            <p className="text-lg text-[#A7AFBE] max-w-[520px] mb-8">
              Sigue tu progreso, chatea con tu entrenador y alcanza tus objetivos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-[16px] font-medium transition-all bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] shadow-[0_0_40px_rgba(255,45,45,0.25)] px-8 py-4 text-lg"
              >
                Ir a mi dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/dashboard/profile"
                className="inline-flex items-center justify-center rounded-[16px] font-medium transition-all text-[#F8FAFC] hover:bg-[#14161B] border border-[rgba(255,255,255,0.08)] px-8 py-4 text-lg"
              >
                Ver mi perfil
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[#0A0A0B]">
        <div className="container mx-auto px-5 md:px-8">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Active Trainers Card */}
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-[#FF2D2D]" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-[#F8FAFC]">{activeTrainers}</p>
                  <p className="text-sm text-[#A7AFBE]">Entrenadores activos</p>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="text-sm text-[#FF2D2D] hover:text-[#FF3D3D] transition-colors inline-flex items-center gap-1"
              >
                Ver chats <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Plan Status Card */}
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center">
                  {hasActivePlan ? (
                    <Award className="w-6 h-6 text-[#FF2D2D]" />
                  ) : (
                    <Target className="w-6 h-6 text-[#A7AFBE]" />
                  )}
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-[#F8FAFC]">
                    {hasActivePlan ? 'Activo' : 'Pendiente'}
                  </p>
                  <p className="text-sm text-[#A7AFBE]">Plan de entrenamiento</p>
                </div>
              </div>
              <Link
                href={hasActivePlan ? "/dashboard/workouts" : "/trainers"}
                className="text-sm text-[#FF2D2D] hover:text-[#FF3D3D] transition-colors inline-flex items-center gap-1"
              >
                {hasActivePlan ? 'Ver plan' : 'Crear plan'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Progress Card */}
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[#FF2D2D]" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-[#F8FAFC]">
                    {profile?.weight_kg ? `${profile.weight_kg} kg` : '--'}
                  </p>
                  <p className="text-sm text-[#A7AFBE]">Peso actual</p>
                </div>
              </div>
              <Link
                href="/dashboard/profile"
                className="text-sm text-[#FF2D2D] hover:text-[#FF3D3D] transition-colors inline-flex items-center gap-1"
              >
                Ver progreso <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="py-16 bg-[#0A0A0B]">
        <div className="container mx-auto px-5 md:px-8">
          <h2 className="font-heading text-3xl font-bold text-[#F8FAFC] mb-8 text-center">
            Accesos Rápidos
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {personas.filter(t => t.is_active !== false).map((trainer) => {
              const chat = chats.find((c) => c.trainer_slug === trainer.slug)
              return (
                <TrainerChatLink
                  key={trainer.slug}
                  trainerSlug={trainer.slug}
                  trainerName={trainer.name}
                  variant="link"
                  className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-2xl">
                      {trainer.name[0]}
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">{trainer.name}</h3>
                      <p className="text-xs text-[#A7AFBE]">{trainer.headline}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#A7AFBE]">
                      {chat ? 'Continuar chat' : 'Iniciar chat'}
                    </span>
                    <ArrowRight className="w-5 h-5 text-[#FF2D2D] group-hover:translate-x-1 transition-transform" />
                  </div>
                </TrainerChatLink>
              )
            })}
            <Link
              href="/explore"
              className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#3B82F6]/50 transition-all hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-[#3B82F6]/20 flex items-center justify-center group-hover:bg-[#3B82F6]/30 transition-colors">
                  <Compass className="w-8 h-8 text-[#3B82F6]" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Explorar</h3>
                  <p className="text-xs text-[#A7AFBE]">Publicaciones y contenido</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#A7AFBE]">Explorar</span>
                <ArrowRight className="w-5 h-5 text-[#3B82F6] group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link
              href="/dashboard/profile"
              className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                  <Target className="w-8 h-8 text-[#FF2D2D]" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Mi Perfil</h3>
                  <p className="text-xs text-[#A7AFBE]">Datos y progreso</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#A7AFBE]">Ver perfil</span>
                <ArrowRight className="w-5 h-5 text-[#FF2D2D] group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link
              href="/dashboard/workouts"
              className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                  <Dumbbell className="w-8 h-8 text-[#FF2D2D]" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Entrenamientos</h3>
                  <p className="text-xs text-[#A7AFBE]">Rutinas y planes</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#A7AFBE]">Ver rutinas</span>
                <ArrowRight className="w-5 h-5 text-[#FF2D2D] group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      <AppFooter />
    </div>
  )
}

