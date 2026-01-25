'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { getTrainerBySlug } from '@/lib/personas'
import { Target, Sparkles, TrendingUp, Zap, CheckCircle2, Users, MessageSquare, FileText, Calendar, ArrowLeft, Star, Instagram, Globe, Youtube, Twitter, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { TrainerChatLink } from '@/app/_components/TrainerChatLink'
import { TrainerQuestionnaireModal } from '@/app/_components/TrainerQuestionnaireModal'
import { RequestAccessButton } from '@/app/_components/RequestAccessButton'
import SafeImage from '@/app/_components/SafeImage'
import PostCard from '@/app/_components/PostCard'
import PostPreview from '@/app/_components/PostPreview'
import { useAuth } from '@/app/_components/AuthProvider'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Componente cliente para las publicaciones del entrenador
function TrainerPostsSection({ userId, trainerName }: { userId: string; trainerName: string }) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const response = await fetch(`/api/social/posts?feed=user&userId=${userId}&limit=${showAll ? 50 : 9}`)
        const data = await response.json()
        if (data.posts) {
          setPosts(data.posts)
        }
      } catch (error) {
        console.error('Error loading trainer posts:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPosts()
  }, [userId, showAll])

  if (loading) {
    return (
      <div className="mt-6 rounded-[22px] bg-[#050509] border border-[rgba(255,255,255,0.14)] p-5">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-[#FF2D2D] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="mt-6 rounded-[22px] bg-[#050509] border border-[rgba(255,255,255,0.14)] p-5">
        <p className="text-sm text-[#A7AFBE] text-center">Este entrenador aún no ha publicado nada</p>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-[22px] bg-[#050509] border border-[rgba(255,255,255,0.14)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#F9FAFB] flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[#FF2D2D]" />
          Publicaciones de {trainerName}
        </h3>
        {posts.length > 9 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-[#FF2D2D] hover:text-[#FF3D3D] transition-colors"
          >
            {showAll ? 'Ver menos' : `Ver todas (${posts.length})`}
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {posts.slice(0, showAll ? posts.length : 9).map((post) => (
          <PostPreview
            key={post.id}
            post={post}
          />
        ))}
      </div>
    </div>
  )
}

// Componente de valoración
function TrainerRating({ trainerSlug }: { trainerSlug: string }) {
  const { user } = useAuth()
  const [userRating, setUserRating] = useState<number | null>(null)
  const [averageRating, setAverageRating] = useState<number>(0)
  const [totalRatings, setTotalRatings] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return

    const loadRating = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Cargar valoración del usuario
        const userRatingRes = await fetch(`/api/trainer/rate?trainerSlug=${trainerSlug}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (userRatingRes.ok) {
          const userData = await userRatingRes.json()
          setUserRating(userData.userRating)
        }

        // Cargar estadísticas del entrenador
        const { data: trainerData } = await supabase
          .from('trainers')
          .select('average_rating, total_ratings')
          .eq('slug', trainerSlug)
          .maybeSingle()

        if (trainerData) {
          setAverageRating(trainerData.average_rating || 0)
          setTotalRatings(trainerData.total_ratings || 0)
        }
      } catch (error) {
        console.error('Error cargando valoración:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRating()
  }, [user, trainerSlug])

  const handleRate = async (rating: number) => {
    if (!user || submitting) return

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/trainer/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          trainerSlug,
          rating,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setUserRating(rating)
        setAverageRating(data.averageRating)
        setTotalRatings(data.totalRatings)
      }
    } catch (error) {
      console.error('Error valorando:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="rounded-[22px] bg-[#050509] border border-[rgba(255,255,255,0.14)] p-5">
      <h3 className="text-sm font-semibold text-[#F9FAFB] mb-3 flex items-center gap-2">
        <Star className="w-4 h-4 text-[#FFD166]" />
        Valoración
      </h3>
      
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-[#FF2D2D] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    disabled={submitting}
                    className={`transition-all ${
                      userRating && star <= userRating
                        ? 'text-[#FFD166]'
                        : 'text-[#6B7280] hover:text-[#FFD166]/50'
                    } ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        userRating && star <= userRating ? 'fill-current' : ''
                      }`}
                    />
                  </button>
                ))}
              </div>
              {userRating && (
                <span className="text-xs text-[#A7AFBE]">Tu valoración: {userRating}/5</span>
              )}
            </div>
            {averageRating > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-[#F9FAFB]">{averageRating.toFixed(1)}</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(averageRating)
                          ? 'text-[#FFD166] fill-current'
                          : 'text-[#6B7280]'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-[#A7AFBE]">({totalRatings} {totalRatings === 1 ? 'valoración' : 'valoraciones'})</span>
              </div>
            )}
            {averageRating === 0 && (
              <p className="text-xs text-[#A7AFBE]">Aún no hay valoraciones</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Componente cliente para los botones CTA
function TrainerCTAButtons({ coach, showConfigure }: { coach: any; showConfigure: boolean }) {
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)

  // Si es entrenador real y requiere solicitud de acceso
  if (coach.isRealTrainer && coach.visibility_status === 'REQUEST_ACCESS') {
    return (
      <div className="flex flex-wrap gap-3 pt-2">
        <RequestAccessButton
          trainerSlug={coach.slug}
          trainerName={coach.name}
        />
      </div>
    )
  }

  if (coach.isRealTrainer) {
    return (
      <div className="flex flex-wrap gap-3 pt-2">
        <TrainerChatLink
          trainerSlug={coach.slug}
          trainerName={coach.name}
          className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#FF2D2D] px-6 py-3 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors shadow-[0_0_30px_rgba(255,45,45,0.3)]"
        >
          <MessageSquare className="w-4 h-4" />
          Empezar a hablar con {coach.name}
        </TrainerChatLink>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 pt-2">
        <TrainerChatLink
          trainerSlug="jey"
          trainerName={coach.name}
          className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#FF2D2D] px-6 py-3 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors shadow-[0_0_30px_rgba(255,45,45,0.3)]"
        >
          <MessageSquare className="w-4 h-4" />
          Empezar a hablar con {coach.name}
        </TrainerChatLink>
        {showConfigure && (
          <button
            onClick={() => setShowQuestionnaire(true)}
            className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-transparent border border-[rgba(255,255,255,0.24)] px-5 py-3 text-sm font-medium text-[#F9FAFB] hover:border-[#FF2D2D]/70 hover:text-[#FFE4E6] transition-colors"
          >
            <FileText className="w-4 h-4" />
            Conoce a {coach.name}
          </button>
        )}
      </div>
      {showQuestionnaire && (
        <TrainerQuestionnaireModal
          isOpen={showQuestionnaire}
          onClose={() => setShowQuestionnaire(false)}
          trainerSlug="jey"
        />
      )}
    </>
  )
}

export default function TrainerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [coach, setCoach] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTrainer = async () => {
      try {
        // Buscar primero en BD (entrenadores reales)
        // Permitir acceso si es PUBLIC o si tiene activation_link (acceso privado)
        const { data: dbTrainer } = await supabase
          .from('trainers')
          .select('*, average_rating, total_ratings, active_students')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle()
        
        // Si el entrenador está en DRAFT/PRIVATE pero tiene activation_link, permitir acceso
        // (esto se maneja a nivel de RLS, pero verificamos aquí también)

        // Si no está en BD, buscar en personas.ts (entrenadores IA predefinidos)
        const personaTrainer = dbTrainer ? null : getTrainerBySlug(slug)

        if (!dbTrainer && !personaTrainer) {
          setCoach(null)
          setLoading(false)
          return
        }

        // Usar datos de BD si existe, sino usar persona
        const trainerData = dbTrainer ? {
          slug: dbTrainer.slug,
          name: dbTrainer.trainer_name,
          headline: dbTrainer.description || dbTrainer.specialty || 'Entrenador personal',
          intensity: dbTrainer.intensity || 5,
          flexibility: dbTrainer.flexibility || 5,
          philosophy: dbTrainer.philosophy || dbTrainer.description || '',
          cycle_weeks: dbTrainer.cycle_weeks || 8,
          isRealTrainer: true,
          user_id: dbTrainer.user_id,
          dbData: dbTrainer,
          avatar_url: dbTrainer.avatar_url,
          instagram_url: dbTrainer.instagram_url,
          website_url: dbTrainer.website_url,
          youtube_url: dbTrainer.youtube_url,
          twitter_url: dbTrainer.twitter_url,
          tiktok_url: dbTrainer.tiktok_url,
          average_rating: dbTrainer.average_rating || 0,
          total_ratings: dbTrainer.total_ratings || 0,
          active_students: dbTrainer.active_students || 0,
          visibility_status: dbTrainer.visibility_status || 'PUBLIC'
        } : {
          ...personaTrainer!,
          isRealTrainer: false,
          // Cargar estadísticas para entrenadores del sistema también
          average_rating: 0,
          total_ratings: 0,
          active_students: 0
        }
        
        // Cargar estadísticas para entrenadores del sistema
        if (!dbTrainer && personaTrainer) {
          const { data: stats } = await supabase
            .from('trainers')
            .select('average_rating, total_ratings, active_students')
            .eq('slug', slug)
            .maybeSingle()
          
          if (stats) {
            trainerData.average_rating = stats.average_rating || 0
            trainerData.total_ratings = stats.total_ratings || 0
            trainerData.active_students = stats.active_students || 0
          }
        }

        setCoach(trainerData)
      } catch (error) {
        console.error('Error cargando entrenador:', error)
        setCoach(null)
      } finally {
        setLoading(false)
      }
    }

    loadTrainer()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050509] flex items-center justify-center">
        <div className="text-[#F8FAFC]">Cargando...</div>
      </div>
    )
  }

  if (!coach) {
    return (
      <div className="min-h-screen bg-[#050509] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-heading text-2xl font-bold text-[#F9FAFB] mb-2">Entrenador no encontrado</h1>
          <p className="text-sm text-[#9CA3AF] mb-6">
            El entrenador que buscas no está disponible ahora mismo. Prueba con otro o vuelve al listado.
          </p>
          <Link
            href="/trainers"
            className="inline-flex items-center justify-center rounded-[18px] bg-[#FF2D2D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors"
          >
            Ver entrenadores
          </Link>
        </div>
      </div>
    )
  }

  const showConfigure = coach.slug === 'jey' && !coach.isRealTrainer

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050509] via-[#050509] to-[#0A0A0B]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Breadcrumb con botón volver */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-xs text-[#9CA3AF] flex items-center gap-2">
            <Link href="/trainers" className="hover:text-[#F9FAFB] transition-colors">
              Entrenadores
            </Link>
            <span className="text-[#4B5563]">/</span>
            <span className="text-[#E5E7EB]">{coach.name}</span>
          </div>
          <Link
            href="/trainers"
            className="inline-flex items-center gap-2 text-sm text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          Volver
          </Link>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#14161B] via-[#14161B] to-[#1F0F12] border border-[rgba(255,255,255,0.12)] shadow-[0_20px_60px_rgba(0,0,0,0.85)] mb-8">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#FF2D2D]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
              <div className="relative flex-shrink-0">
                {coach.avatar_url ? (
                  <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-3xl overflow-hidden border-2 border-[rgba(255,255,255,0.1)] shadow-[0_20px_45px_rgba(0,0,0,0.8)]">
                    <SafeImage
                      src={coach.avatar_url}
                      alt={coach.name}
                      className="w-full h-full object-cover"
                      fallbackSrc=""
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-gradient-to-br from-[#FF2D2D] to-[#7F1D1D] flex items-center justify-center text-white font-heading font-bold text-4xl md:text-5xl shadow-[0_20px_45px_rgba(0,0,0,0.8)]">
                    {coach.name[0]}
                  </div>
                )}
                {!coach.isRealTrainer && (
                  <div className="absolute -bottom-2 -right-2 rounded-full bg-[#050509] px-3 py-1 border-2 border-[rgba(255,255,255,0.24)]">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#E5E7EB] font-semibold">IA</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9CA3AF] mb-2 font-medium">
                  {coach.isRealTrainer ? 'Entrenador' : 'Entrenador virtual'}
                </p>
                <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#F9FAFB] leading-tight mb-2">
                  {coach.name}
                </h1>
                <p className="text-base md:text-lg text-[#FFB3B3] font-semibold mb-3">{coach.headline}</p>
                <p className="text-sm md:text-base text-[#A7AFBE] leading-relaxed max-w-2xl mb-4">
                  {coach.philosophy}
                </p>
                
                {/* Links sociales */}
                {(coach.instagram_url || coach.website_url || coach.youtube_url || coach.twitter_url || coach.tiktok_url) && (
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    {coach.instagram_url && (
                      <a
                        href={coach.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#A7AFBE] hover:text-[#FF2D2D] hover:border-[#FF2D2D]/50 transition-colors text-sm"
                      >
                        <Instagram className="w-4 h-4" />
                        <span>Instagram</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {coach.website_url && (
                      <a
                        href={coach.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#A7AFBE] hover:text-[#FF2D2D] hover:border-[#FF2D2D]/50 transition-colors text-sm"
                      >
                        <Globe className="w-4 h-4" />
                        <span>Web</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {coach.youtube_url && (
                      <a
                        href={coach.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#A7AFBE] hover:text-[#FF2D2D] hover:border-[#FF2D2D]/50 transition-colors text-sm"
                      >
                        <Youtube className="w-4 h-4" />
                        <span>YouTube</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {coach.twitter_url && (
                      <a
                        href={coach.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#A7AFBE] hover:text-[#FF2D2D] hover:border-[#FF2D2D]/50 transition-colors text-sm"
                      >
                        <Twitter className="w-4 h-4" />
                        <span>Twitter</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-6 lg:gap-8">
          {/* Contenido principal */}
          <div className="space-y-6">
            {/* Stats destacadas */}
            <div className="grid grid-cols-3 gap-4">
              <div className="relative overflow-hidden rounded-2xl bg-[#0A0A0B] border border-[rgba(255,255,255,0.12)] p-4 group hover:border-[#FF2D2D]/50 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF2D2D]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-[#FF2D2D]" />
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#9CA3AF] font-medium">Intensidad</span>
                  </div>
                  <p className="font-heading text-2xl font-bold text-[#F9FAFB] mb-1">
                    {coach.intensity}
                    <span className="text-sm text-[#6B7280] font-normal">/10</span>
                  </p>
                  <div className="w-full h-1.5 bg-[#1A1D24] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#FF2D2D] to-[#FF5555] rounded-full transition-all"
                      style={{ width: `${(coach.intensity / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="relative overflow-hidden rounded-2xl bg-[#0A0A0B] border border-[rgba(255,255,255,0.12)] p-4 group hover:border-[#22C55E]/50 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-[#22C55E]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-[#22C55E]" />
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#9CA3AF] font-medium">Flexibilidad</span>
                  </div>
                  <p className="font-heading text-2xl font-bold text-[#F9FAFB] mb-1">
                    {coach.flexibility}
                    <span className="text-sm text-[#6B7280] font-normal">/10</span>
                  </p>
                  <div className="w-full h-1.5 bg-[#1A1D24] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#22C55E] to-[#4ADE80] rounded-full transition-all"
                      style={{ width: `${(coach.flexibility / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="relative overflow-hidden rounded-2xl bg-[#0A0A0B] border border-[rgba(255,255,255,0.12)] p-4 group hover:border-[#38BDF8]/50 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-[#38BDF8]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-[#38BDF8]" />
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#9CA3AF] font-medium">Duración</span>
                  </div>
                  <p className="font-heading text-2xl font-bold text-[#F9FAFB] mb-1">
                    {coach.cycle_weeks}
                    <span className="text-sm text-[#6B7280] font-normal"> sem</span>
                  </p>
                  <p className="text-[11px] text-[#9CA3AF] mt-1">Bloques estructurados</p>
                </div>
              </div>
            </div>

            {/* Características visuales - Solo para entrenadores IA */}
            {!coach.isRealTrainer && (
              <>
                <div className="rounded-[24px] bg-[#050509] border border-[rgba(255,255,255,0.12)] p-6">
                  <h2 className="font-heading text-lg font-bold text-[#F9FAFB] mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#FF2D2D]" />
                    ¿Qué te ofrece?
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#FF2D2D]/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-[#FF2D2D]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#F9FAFB] mb-1">Alta exigencia</p>
                        <p className="text-xs text-[#A7AFBE] leading-relaxed">Mentalidad sin excusas, te aprieta cuando hace falta</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#22C55E]/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#F9FAFB] mb-1">Planes estructurados</p>
                        <p className="text-xs text-[#A7AFBE] leading-relaxed">Por semanas, no rutinas sueltas</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#38BDF8]/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-[#38BDF8]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#F9FAFB] mb-1">Ajustes inteligentes</p>
                        <p className="text-xs text-[#A7AFBE] leading-relaxed">En función de tu rendimiento y adherencia</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#FFB020]/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-[#FFB020]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#F9FAFB] mb-1">Feedback directo</p>
                        <p className="text-xs text-[#A7AFBE] leading-relaxed">Refuerza cuando cumples, aprieta cuando aflojas</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] bg-gradient-to-br from-[#0A0A0B] to-[#050509] border border-[rgba(255,255,255,0.12)] p-6">
                  <h2 className="font-heading text-lg font-bold text-[#F9FAFB] mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#FF2D2D]" />
                    Ideal para ti si...
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF2D2D]/10 border border-[#FF2D2D]/30 text-xs font-medium text-[#FFB3B3]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Quieres resultados visibles
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF2D2D]/10 border border-[#FF2D2D]/30 text-xs font-medium text-[#FFB3B3]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      No buscas un entrenador "blandito"
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF2D2D]/10 border border-[#FF2D2D]/30 text-xs font-medium text-[#FFB3B3]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Te gusta que te hablen claro
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF2D2D]/10 border border-[#FF2D2D]/30 text-xs font-medium text-[#FFB3B3]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Todo integrado en una app
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* CTAs */}
            <TrainerCTAButtons 
              coach={coach} 
              showConfigure={showConfigure}
            />

            {/* Publicaciones del entrenador */}
            {coach.isRealTrainer && coach.user_id && (
              <TrainerPostsSection userId={coach.user_id} trainerName={coach.name} />
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-[22px] bg-[#050509] border border-[rgba(255,255,255,0.14)] p-5">
              <h3 className="text-sm font-semibold text-[#F9FAFB] mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#FF2D2D]" />
                Qué incluye
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF2D2D] mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-[#E5E7EB]">Entrenamientos estructurados por días y semanas</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF2D2D] mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-[#E5E7EB]">Dietas y guías de alimentación en bloques</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF2D2D] mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-[#E5E7EB]">Seguimiento de peso, fotos y mensajes automáticos</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF2D2D] mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-[#E5E7EB]">Material basado solo en contenido del entrenador (no inventa)</p>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] bg-gradient-to-br from-[#1F0F12] to-[#050509] border border-[rgba(255,45,45,0.2)] p-5">
              <h3 className="text-sm font-semibold text-[#F9FAFB] mb-2">⚠️ Aviso importante</h3>
              <p className="text-[11px] text-[#E5E7EB] leading-relaxed">
                {coach.name} es una IA diseñada para ayudarte a entrenar y comer mejor, pero{' '}
                <span className="font-semibold text-[#FFB3B3]">no sustituye a un profesional sanitario</span>.
                Si tienes patologías o lesiones serias, habla siempre con tu médico o fisio antes de seguir cualquier plan.
              </p>
            </div>

            <Link
              href="/trainers"
              className="block text-center rounded-[18px] bg-transparent border border-[rgba(255,255,255,0.14)] px-4 py-2.5 text-xs font-medium text-[#9CA3AF] hover:text-[#E5E7EB] hover:border-[rgba(255,255,255,0.24)] transition-colors"
            >
              ← Volver a explorar entrenadores
            </Link>
          </aside>
        </div>
      </div>
    </div>
  )
}
