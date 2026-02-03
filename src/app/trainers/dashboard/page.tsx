'use client'

import React, { useEffect, useState } from 'react'
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
  Settings, 
  ArrowRight,
  Target,
  BarChart3,
  Star,
  Lightbulb,
  Info
} from 'lucide-react'
import { LoadingScreen } from '@/app/_components/LoadingScreen'
import { cn } from '@/lib/utils'
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
        
        hasCertificates = !!(certificates && certificates.length > 0)
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

      // Estadísticas desde API (datos reales de la BD, sin depender de RLS)
      try {
        const statsRes = await fetch('/api/trainer/stats', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats({
            totalStudents: statsData.activeStudents ?? 0,
            activeStudents: statsData.activeStudents ?? 0,
            totalWorkouts: statsData.totalWorkouts ?? 0,
            totalDiets: statsData.totalDiets ?? 0
          })
        } else {
          throw new Error('Stats API failed')
        }
      } catch {
        setStats({ totalStudents: 0, activeStudents: 0, totalWorkouts: 0, totalDiets: 0 })
      }
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
    <>
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          {/* Welcome - compacto */}
          <p className="text-sm sm:text-base text-[#A7AFBE]">
            Hola {displayName}, gestiona tu contenido y conecta con tus alumnos.
          </p>

          {/* Mini-cards métricas - 2 por fila */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[16px] p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF2D2D]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg sm:text-xl font-heading font-bold text-[#F8FAFC]">{stats.totalStudents}</p>
                  <p className="text-[10px] sm:text-xs text-[#A7AFBE]">Alumnos</p>
                </div>
              </div>
            </div>

            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[16px] p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#22C55E]/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#22C55E]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg sm:text-xl font-heading font-bold text-[#F8FAFC]">{stats.activeStudents}</p>
                  <p className="text-[10px] sm:text-xs text-[#A7AFBE]">Activos</p>
                </div>
              </div>
            </div>

            <Link href="/trainers/content/workouts" className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[16px] p-3 sm:p-4 hover:border-[#38BDF8]/50 transition-all group">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#38BDF8]/20 flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-[#38BDF8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg sm:text-xl font-heading font-bold text-[#F8FAFC]">{stats.totalWorkouts}</p>
                  <p className="text-[10px] sm:text-xs text-[#A7AFBE]">Entrenamientos</p>
                </div>
              </div>
            </Link>

            <Link href="/trainers/content/diets" className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[16px] p-3 sm:p-4 hover:border-[#FFB020]/50 transition-all group">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#FFB020]/20 flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFB020]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg sm:text-xl font-heading font-bold text-[#F8FAFC]">{stats.totalDiets}</p>
                  <p className="text-[10px] sm:text-xs text-[#A7AFBE]">Dietas</p>
                </div>
              </div>
            </Link>
          </div>

          {/* CTAs principales - clicables, sin duplicar */}
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            <Link href="/trainers/content/workouts" className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[16px] p-4 sm:p-5 hover:border-[#FF2D2D]/50 transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-5 h-5 text-[#FF2D2D]" />
                </div>
                <h3 className="font-heading font-bold text-[#F8FAFC]">Entrenamientos</h3>
                <ArrowRight className="w-4 h-4 text-[#FF2D2D] ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-[#A7AFBE]">
                Define tu metodología y alimenta tu IA con tu estilo único.
              </p>
            </Link>

            <Link href="/trainers/content/diets" className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[16px] p-4 sm:p-5 hover:border-[#22C55E]/50 transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#22C55E]/20 flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed className="w-5 h-5 text-[#22C55E]" />
                </div>
                <h3 className="font-heading font-bold text-[#F8FAFC]">Planes de Dieta</h3>
                <ArrowRight className="w-4 h-4 text-[#22C55E] ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-[#A7AFBE]">
                Define tu enfoque nutricional y guía a tu entrenador virtual.
              </p>
            </Link>
          </div>

          {/* Aviso IA - colapsable */}
          <details className="group">
            <summary className="flex items-center gap-2 p-3 rounded-[12px] bg-[#3B82F6]/10 border border-[#3B82F6]/30 cursor-pointer list-none text-sm text-[#A7AFBE] hover:text-[#F8FAFC]">
              <Lightbulb className="w-4 h-4 text-[#3B82F6] flex-shrink-0" />
              <span>Usa tu IA 1-2 días/semana para detectar errores antes de publicar</span>
              <Info className="w-4 h-4 ml-auto text-[#7B8291] group-open:rotate-180 transition-transform" />
            </summary>
            <p className="mt-2 p-3 pl-9 text-xs text-[#A7AFBE]">
              Usa tu propio entrenador virtual IA durante 1–2 días/semana para detectar errores, incoherencias o cosas con las que no estés de acuerdo y ajustarlo antes de publicarlo o enviarlo a alumnos.
            </p>
          </details>

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
                <label className={cn(
                  "flex items-start gap-3 p-3 rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] transition-colors",
                  trainer.visibility_status === 'PENDING_REVIEW' ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:border-[#FF2D2D]/50"
                )}>
                  <input
                    type="radio"
                    name="visibility"
                    value="REQUEST_ACCESS"
                    checked={trainer.visibility_status === 'REQUEST_ACCESS'}
                    disabled={trainer.visibility_status === 'PENDING_REVIEW'}
                    onChange={() => {
                      if (trainer.visibility_status !== 'PENDING_REVIEW') setShowRequestPublicModal(true)
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#F8FAFC]">Solicitud de acceso</p>
                    <p className="text-xs text-[#A7AFBE]">Los alumnos pueden solicitarte acceso. Requiere completar solicitud.</p>
                  </div>
                </label>
                <label className={cn(
                  "flex items-start gap-3 p-3 rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] transition-colors",
                  trainer.visibility_status === 'PENDING_REVIEW' ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:border-[#FF2D2D]/50"
                )}>
                  <input
                    type="radio"
                    name="visibility"
                    value="PUBLIC"
                    checked={trainer.visibility_status === 'PUBLIC'}
                    disabled={trainer.visibility_status === 'PENDING_REVIEW'}
                    onChange={() => {
                      if (trainer.visibility_status !== 'PENDING_REVIEW') setShowRequestPublicModal(true)
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
                    className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#FF2D2D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Solicitar aparecer en público
                  </button>
                </div>
              </>
            ) : trainer.visibility_status === 'PENDING_REVIEW' ? (
              <>
              <div className="mb-4 p-4 rounded-[16px] bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-300 mb-2">
                  <strong>Tu solicitud está pendiente de revisión.</strong>
                </p>
                <p className="text-xs text-blue-200/80">
                  Recibirás una notificación cuando sea revisada. No puedes solicitar de nuevo hasta que se resuelva.
                </p>
              </div>
              <button disabled className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#5A6170] px-5 py-2.5 text-sm font-semibold text-[#A7AFBE] cursor-not-allowed opacity-60">
                Solicitud pendiente
              </button>
              </>
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

          {/* Herramientas - compacto, Configuración arriba */}
          <div>
            <h2 className="font-heading text-base sm:text-lg font-bold text-[#F8FAFC] mb-3">Herramientas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/trainers/settings" className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4 hover:border-[#FF2D2D]/50 transition-all group flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-5 h-5 text-[#FF2D2D]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-bold text-[#F8FAFC] text-sm">Configuración</h3>
                  <p className="text-[10px] text-[#A7AFBE]">Ajustes y preferencias</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#FF2D2D] flex-shrink-0" />
              </Link>
              <Link href="/trainers/onboarding" className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4 hover:border-[#FF2D2D]/50 transition-all group flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-[#FF2D2D]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-bold text-[#F8FAFC] text-sm">Onboarding</h3>
                  <p className="text-[10px] text-[#A7AFBE]">Configura tu IA</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#FF2D2D] flex-shrink-0" />
              </Link>
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4 flex items-center gap-3 opacity-70">
                <div className="w-10 h-10 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-[#FF2D2D]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-bold text-[#F8FAFC] text-sm">Analíticas</h3>
                  <p className="text-[10px] text-[#A7AFBE]">Próximamente</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
    </>
  )
}

