'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { 
  Dumbbell, 
  UtensilsCrossed, 
  Users, 
  TrendingUp, 
  Plus, 
  FileText, 
  Award, 
  Settings, 
  ArrowRight,
  Target,
  MessageCircle,
  Zap,
  BarChart3,
  Star,
  ArrowLeft,
  Home,
  Compass
} from 'lucide-react'
import { LoadingScreen } from '@/app/_components/LoadingScreen'
import { CreatePostModal } from '@/app/_components/CreatePostModal'
import { RequestPublicModal } from '@/app/_components/RequestPublicModal'
import PostCard from '@/app/_components/PostCard'
import PostPreview from '@/app/_components/PostPreview'

export default function TrainerDashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [trainer, setTrainer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalWorkouts: 0,
    totalDiets: 0
  })
  const [posts, setPosts] = useState<any[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [showCreatePostModal, setShowCreatePostModal] = useState(false)
  const [showRequestPublicModal, setShowRequestPublicModal] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }

    if (user) {
      loadTrainerData()
    }
  }, [user, authLoading, router])

  const loadTrainerData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Cargar perfil de entrenador (incluyendo campos de visibilidad)
      const { data: trainerData, error: trainerError } = await supabase
        .from('trainers')
        .select('*, visibility_status, social_handle, social_proof, activation_link')
        .eq('user_id', session.user.id)
        .maybeSingle()
      
      // Cargar certificados del entrenador
      let hasCertificates = false
      if (trainerData) {
        const { data: certificates } = await supabase
          .from('trainer_certificates')
          .select('id, certificate_file_url')
          .eq('trainer_id', trainerData.id)
          .not('certificate_file_url', 'is', null)
        
        hasCertificates = certificates && certificates.length > 0
        trainerData.hasCertificates = hasCertificates
      }

      if (trainerError) {
        console.error('Error cargando trainer:', trainerError)
        setLoading(false)
        return
      }

      if (!trainerData) {
        // No tiene perfil de entrenador, redirigir a registro
        router.push('/trainers/register?step=2')
        return
      }

      setTrainer(trainerData)

      // Cargar posts
      loadPosts(trainerData.user_id)

      // Cargar estadísticas
      // Contar alumnos activos desde trainer_chats (usuarios únicos con chat abierto)
      const { data: chatsData } = await supabase
        .from('trainer_chats')
        .select('user_id')
        .eq('trainer_slug', trainerData.slug)
      
      const uniqueActiveStudents = new Set(chatsData?.map(c => c.user_id) || []).size

      const [workoutsRes, dietsRes] = await Promise.all([
        supabase
          .from('trainer_workouts')
          .select('id')
          .eq('trainer_id', trainerData.id),
        supabase
          .from('trainer_diets')
          .select('id')
          .eq('trainer_id', trainerData.id)
      ])

      setStats({
        totalStudents: uniqueActiveStudents,
        activeStudents: uniqueActiveStudents,
        totalWorkouts: workoutsRes.data?.length || 0,
        totalDiets: dietsRes.data?.length || 0
      })
    } catch (err) {
      console.error('Error cargando datos:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPosts = async (userId: string) => {
    setLoadingPosts(true)
    try {
      const response = await fetch(`/api/social/posts?feed=user&userId=${userId}&limit=50`)
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

  if (authLoading || loading) {
    return <LoadingScreen />
  }

  if (!trainer) {
    return null
  }

  const displayName = trainer.trainer_name || trainer.full_name || user?.email?.split('@')[0] || 'Entrenador'

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      {/* Navigation Bar */}
      <div className="sticky top-0 z-40 bg-[#0A0A0B]/80 backdrop-blur-lg border-b border-[rgba(255,255,255,0.08)]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#A7AFBE] hover:text-[#F8FAFC] hover:border-[#FF2D2D]/50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Volver</span>
              </Link>
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#A7AFBE] hover:text-[#F8FAFC] transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="text-sm font-medium">Inicio</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/explore"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#A7AFBE] hover:text-[#3B82F6] transition-colors"
              >
                <Compass className="w-4 h-4" />
                <span className="text-sm font-medium">Explorar</span>
              </Link>
              <Link
                href="/trainers/settings"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#A7AFBE] hover:text-[#F8FAFC] hover:border-[#FF2D2D]/50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Configuración</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-[#FF2D2D]/10 to-[#FF2D2D]/5 border border-[#FF2D2D]/20 rounded-[22px] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-3xl font-bold text-[#F8FAFC] mb-2">
                  ¡Hola, {displayName}! 👋
                </h1>
                <p className="text-[#A7AFBE]">
                  Gestiona tu contenido, conecta con tus alumnos y haz crecer tu marca personal.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center group-hover:bg-[#FF2D2D]/30 transition-colors">
                  <Users className="w-6 h-6 text-[#FF2D2D]" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-heading font-bold text-[#F8FAFC]">{stats.totalStudents}</p>
                  <p className="text-sm text-[#A7AFBE]">Total Alumnos</p>
                </div>
              </div>
            </div>

            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#22C55E]/50 transition-all hover:shadow-[0_0_40px_rgba(34,197,94,0.15)] group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#22C55E]/20 flex items-center justify-center group-hover:bg-[#22C55E]/30 transition-colors">
                  <TrendingUp className="w-6 h-6 text-[#22C55E]" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-heading font-bold text-[#F8FAFC]">{stats.activeStudents}</p>
                  <p className="text-sm text-[#A7AFBE]">Alumnos Activos</p>
                </div>
              </div>
            </div>

            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#38BDF8]/50 transition-all hover:shadow-[0_0_40px_rgba(56,189,248,0.15)] group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#38BDF8]/20 flex items-center justify-center group-hover:bg-[#38BDF8]/30 transition-colors">
                  <Dumbbell className="w-6 h-6 text-[#38BDF8]" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-heading font-bold text-[#F8FAFC]">{stats.totalWorkouts}</p>
                  <p className="text-sm text-[#A7AFBE]">Entrenamientos</p>
                </div>
              </div>
            </div>

            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FFB020]/50 transition-all hover:shadow-[0_0_40px_rgba(255,176,32,0.15)] group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#FFB020]/20 flex items-center justify-center group-hover:bg-[#FFB020]/30 transition-colors">
                  <UtensilsCrossed className="w-6 h-6 text-[#FFB020]" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-heading font-bold text-[#F8FAFC]">{stats.totalDiets}</p>
                  <p className="text-sm text-[#A7AFBE]">Planes de Dieta</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-6">Gestiona tu Contenido</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Link
                href="/trainers/content/workouts"
                className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center group-hover:bg-[#FF2D2D]/30 transition-colors flex-shrink-0">
                    <Dumbbell className="w-6 h-6 text-[#FF2D2D]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-lg font-bold text-[#F8FAFC] mb-1">Entrenamientos</h3>
                    <p className="text-sm text-[#A7AFBE] mb-4">
                      Define tu metodología y alimenta a tu IA con tu estilo de entrenamiento único
                    </p>
                    <div className="flex items-center gap-2 text-sm text-[#FF2D2D] group-hover:gap-3 transition-all">
                      <span>Gestionar entrenamientos</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                href="/trainers/content/diets"
                className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#22C55E]/50 transition-all hover:shadow-[0_0_40px_rgba(34,197,94,0.15)] group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#22C55E]/20 flex items-center justify-center group-hover:bg-[#22C55E]/30 transition-colors flex-shrink-0">
                    <UtensilsCrossed className="w-6 h-6 text-[#22C55E]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-lg font-bold text-[#F8FAFC] mb-1">Planes de Dieta</h3>
                    <p className="text-sm text-[#A7AFBE] mb-4">
                      Define tu enfoque nutricional y guía a tu entrenador virtual con tus principios
                    </p>
                    <div className="flex items-center gap-2 text-sm text-[#22C55E] group-hover:gap-3 transition-all">
                      <span>Gestionar dietas</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Profile Section */}
          <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Tu Perfil</h3>
              <Star className="w-5 h-5 text-[#FFB020]" />
            </div>
            
            {/* Selector de Visibilidad */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#A7AFBE] mb-3">
                Visibilidad del perfil
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] cursor-pointer hover:border-[#FF2D2D]/50 transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value="PRIVATE"
                    checked={trainer.visibility_status === 'DRAFT' || trainer.visibility_status === 'PRIVATE'}
                    onChange={async () => {
                      // Actualizar a PRIVATE
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session) return
                      
                      const { error } = await supabase
                        .from('trainers')
                        .update({ visibility_status: 'PRIVATE' })
                        .eq('id', trainer.id)
                      
                      if (!error) {
                        setTrainer({ ...trainer, visibility_status: 'PRIVATE' })
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#F8FAFC]">Privado</p>
                    <p className="text-xs text-[#A7AFBE]">Tu perfil es privado. Solo tú puedes acceder.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] cursor-pointer hover:border-[#FF2D2D]/50 transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value="REQUEST_ACCESS"
                    checked={trainer.visibility_status === 'REQUEST_ACCESS'}
                    onChange={() => {
                      // Siempre mostrar modal de solicitud para REQUEST_ACCESS o PUBLIC
                      setShowRequestPublicModal(true)
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#F8FAFC]">Solicitud de acceso</p>
                    <p className="text-xs text-[#A7AFBE]">Los alumnos pueden solicitarte acceso. Requiere completar solicitud.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] cursor-pointer hover:border-[#FF2D2D]/50 transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value="PUBLIC"
                    checked={trainer.visibility_status === 'PUBLIC'}
                    onChange={() => {
                      // Siempre mostrar modal de solicitud para PUBLIC
                      setShowRequestPublicModal(true)
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#F8FAFC]">Público</p>
                    <p className="text-xs text-[#A7AFBE]">Apareces en la lista pública. Requiere solicitud y aprobación.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Estado de visibilidad y CTAs */}
            {trainer.visibility_status === 'DRAFT' || trainer.visibility_status === 'PRIVATE' ? (
              <>
                <div className="mb-4 p-4 rounded-[16px] bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm text-yellow-300 mb-2">
                    <strong>Tu perfil está privado.</strong>
                  </p>
                  <p className="text-xs text-yellow-200/80">
                    No aparece en público. Puedes compartir tu link para que tus alumnos lo usen.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/trainers/${trainer.slug}`
                      navigator.clipboard.writeText(url).catch(() => {
                        // Fallback
                        const textarea = document.createElement('textarea')
                        textarea.value = url
                        document.body.appendChild(textarea)
                        textarea.select()
                        document.execCommand('copy')
                        document.body.removeChild(textarea)
                      })
                      alert('Enlace copiado al portapapeles')
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-transparent border border-[rgba(255,255,255,0.24)] px-5 py-2.5 text-sm font-medium text-[#A7AFBE] hover:border-[rgba(255,255,255,0.4)] hover:text-[#F8FAFC] transition-colors"
                  >
                    Copiar link
                  </button>
                  <button
                    onClick={() => setShowRequestPublicModal(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#FF2D2D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors"
                  >
                    Solicitar aparecer en público
                  </button>
                </div>
              </>
            ) : trainer.visibility_status === 'PENDING_REVIEW' ? (
              <div className="mb-4 p-4 rounded-[16px] bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-300 mb-2">
                  <strong>Tu solicitud está pendiente de revisión.</strong>
                </p>
                <p className="text-xs text-blue-200/80">
                  Recibirás una notificación cuando sea revisada.
                </p>
              </div>
            ) : trainer.visibility_status === 'PUBLIC' ? (
              <>
                <p className="text-sm text-[#A7AFBE] mb-4">
                  Tu perfil está visible públicamente. Los alumnos pueden encontrarte y empezar a trabajar contigo.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/trainers/${trainer.slug}`}
                    className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#FF2D2D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors"
                  >
                    Ver mi perfil público
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/trainers/${trainer.slug}`
                      navigator.clipboard.writeText(url).catch(() => {
                        const textarea = document.createElement('textarea')
                        textarea.value = url
                        document.body.appendChild(textarea)
                        textarea.select()
                        document.execCommand('copy')
                        document.body.removeChild(textarea)
                      })
                      alert('Enlace copiado al portapapeles')
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-transparent border border-[rgba(255,255,255,0.24)] px-5 py-2.5 text-sm font-medium text-[#A7AFBE] hover:border-[rgba(255,255,255,0.4)] hover:text-[#F8FAFC] transition-colors"
                  >
                    Copiar enlace
                  </button>
                </div>
              </>
            ) : trainer.visibility_status === 'REJECTED' ? (
              <>
                <div className="mb-4 p-4 rounded-[16px] bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-300 mb-2">
                    <strong>Tu solicitud fue rechazada.</strong>
                  </p>
                  <p className="text-xs text-red-200/80">
                    Revisa y mejora tus datos proporcionados y vuelve a intentarlo.
                  </p>
                </div>
                <button
                  onClick={() => setShowRequestPublicModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#FF2D2D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors"
                >
                  Volver a solicitar
                </button>
              </>
            ) : null}
            
            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
              <Link
                href="/trainers/settings"
                className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-transparent border border-[rgba(255,255,255,0.24)] px-5 py-2.5 text-sm font-medium text-[#F8FAFC] hover:border-[rgba(255,255,255,0.4)] transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configuración
              </Link>
            </div>
          </div>

          {/* Publicaciones Section */}
          <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#FF2D2D]" />
                Mis Publicaciones
              </h3>
              <button
                onClick={() => setShowCreatePostModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Nueva publicación
              </button>
            </div>
            <p className="text-sm text-[#A7AFBE] mb-4">
              Comparte ejercicios, consejos y contenido para que los alumnos te conozcan mejor.
            </p>
            {loadingPosts ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-[#FF2D2D] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#A7AFBE] mb-4">No has publicado nada aún</p>
                <button
                  onClick={() => setShowCreatePostModal(true)}
                  className="px-4 py-2 bg-[#FF2D2D] text-white rounded-lg font-medium hover:bg-[#FF3D3D] transition-colors"
                >
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

          {/* Additional Quick Actions */}
          <div>
            <h2 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-6">Herramientas</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Link
                href="/trainers/onboarding"
                className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center group-hover:bg-[#FF2D2D]/30 transition-colors">
                    <Target className="w-6 h-6 text-[#FF2D2D]" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Onboarding</h3>
                    <p className="text-xs text-[#A7AFBE]">Configura tu IA</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#FF2D2D] group-hover:gap-3 transition-all">
                  <span>Configurar</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              <Link
                href="/trainers/settings"
                className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center group-hover:bg-[#FF2D2D]/30 transition-colors">
                    <Settings className="w-6 h-6 text-[#FF2D2D]" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Configuración</h3>
                    <p className="text-xs text-[#A7AFBE]">Ajustes y preferencias</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#FF2D2D] group-hover:gap-3 transition-all">
                  <span>Ver ajustes</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-[#FF2D2D]" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Analíticas</h3>
                    <p className="text-xs text-[#A7AFBE]">Próximamente</p>
                  </div>
                </div>
                <p className="text-xs text-[#7B8291]">Métricas detalladas de tus alumnos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {trainer && (
        <>
          <CreatePostModal
            isOpen={showCreatePostModal}
            onClose={() => setShowCreatePostModal(false)}
            onSuccess={() => {
              loadPosts(trainer.user_id)
              setShowCreatePostModal(false)
            }}
          />
          <RequestPublicModal
            isOpen={showRequestPublicModal}
            onClose={() => setShowRequestPublicModal(false)}
            onSuccess={() => {
              loadTrainerData() // Recargar datos del entrenador
            }}
            trainer={{
              id: trainer.id,
              visibility_status: trainer.visibility_status,
              avatar_url: trainer.avatar_url,
              hasCertificates: trainer.hasCertificates || false,
              social_handle: trainer.social_handle,
              social_proof: trainer.social_proof,
              description: trainer.description
            }}
          />
        </>
      )}
    </div>
  )
}

