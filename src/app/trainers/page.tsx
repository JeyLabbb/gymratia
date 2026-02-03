'use client'

import { useState, useMemo, useEffect } from 'react'
import { getActiveTrainers } from '@/lib/personas'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowRight, Sparkles, Target, Search, Star, Users, TrendingUp, Flame } from 'lucide-react'
import { TrainerChatLink } from '@/app/_components/TrainerChatLink'
import SafeImage from '@/app/_components/SafeImage'
import { AppFooter } from '@/app/_components/AppFooter'

type TrainerFromDB = {
  slug: string
  trainer_name: string
  description: string
  philosophy: string
  intensity: number
  flexibility: number
  cycle_weeks: number
  active_students?: number
  average_rating?: number
  total_ratings?: number
  avatar_url?: string
  is_featured?: boolean
  visibility_status?: string
  isRealTrainer: true
}

type TrainerFromPersonas = {
  slug: string
  name: string
  headline: string
  philosophy: string
  intensity: number
  flexibility: number
  cycle_weeks: number
  isRealTrainer: false
  active_students?: number
  average_rating?: number
  total_ratings?: number
}

type CombinedTrainer = TrainerFromDB | TrainerFromPersonas

export default function Trainers() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'intensity' | 'flexibility' | 'students' | 'rating'>('students')
  const [dbTrainers, setDbTrainers] = useState<TrainerFromDB[]>([])
  const [loading, setLoading] = useState(true)

  // Cargar entrenadores de BD
  useEffect(() => {
    const loadDbTrainers = async () => {
      try {
        const { data } = await supabase
          .from('trainers')
          .select('slug, trainer_name, description, philosophy, intensity, flexibility, cycle_weeks, active_students, average_rating, total_ratings, avatar_url, is_featured, visibility_status')
          .eq('is_active', true)
          .in('visibility_status', ['PUBLIC', 'REQUEST_ACCESS']) // Solo mostrar entrenadores públicos o con solicitud de acceso

        if (data) {
          setDbTrainers(data.map(t => ({
            slug: t.slug,
            trainer_name: t.trainer_name,
            description: t.description || '',
            philosophy: t.philosophy || t.description || '',
            intensity: t.intensity || 5,
            flexibility: t.flexibility || 5,
            cycle_weeks: t.cycle_weeks || 8,
            active_students: t.active_students || 0,
            average_rating: t.average_rating || 0,
            total_ratings: t.total_ratings || 0,
            avatar_url: t.avatar_url || undefined,
            is_featured: t.is_featured || false,
            visibility_status: t.visibility_status || 'PUBLIC',
            isRealTrainer: true as const
          })))
        }
      } catch (err) {
        console.error('Error cargando entrenadores de BD:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDbTrainers()
  }, [])

  // Combinar entrenadores de personas.ts y BD
  // Filtrar los de personas.ts que ya existen en la BD para evitar duplicados
  const allTrainers: CombinedTrainer[] = useMemo(() => {
    const personaTrainers = getActiveTrainers()
      .filter(personaTrainer => {
        // Excluir si ya existe en la BD con el mismo slug
        return !dbTrainers.some(dbTrainer => dbTrainer.slug === personaTrainer.slug)
      })
      .map(t => ({
        ...t,
        isRealTrainer: false as const,
        active_students: 0,
        average_rating: 0,
        total_ratings: 0,
        is_featured: t.slug === 'jey', // Jey siempre destacado
        visibility_status: 'PUBLIC' // Los entrenadores del sistema son siempre públicos
      }))
    
    return [...personaTrainers, ...dbTrainers]
  }, [dbTrainers])

  // Featured: primero buscar por is_featured=true, luego jey, luego el primero
  const featured = useMemo(() => {
    const featuredFromDB = allTrainers.find(t => t.isRealTrainer && t.is_featured)
    if (featuredFromDB) return featuredFromDB
    
    const jey = allTrainers.find(t => t.slug === 'jey')
    if (jey) return jey
    
    return allTrainers[0]
  }, [allTrainers])

  const filteredAndSortedTrainers = useMemo(() => {
    let filtered = allTrainers.filter((trainer) => {
      const query = searchQuery.toLowerCase()
      const name = trainer.isRealTrainer ? trainer.trainer_name : trainer.name
      const headline = trainer.isRealTrainer ? trainer.description : trainer.headline
      
      return (
        name.toLowerCase().includes(query) ||
        headline.toLowerCase().includes(query) ||
        trainer.philosophy.toLowerCase().includes(query)
      )
    })

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = a.isRealTrainer ? a.trainer_name : a.name
        const nameB = b.isRealTrainer ? b.trainer_name : b.name
        return nameA.localeCompare(nameB)
      }
      if (sortBy === 'intensity') return b.intensity - a.intensity
      if (sortBy === 'flexibility') return b.flexibility - a.flexibility
      if (sortBy === 'students') return (b.active_students || 0) - (a.active_students || 0)
      if (sortBy === 'rating') {
        const ratingA = a.average_rating || 0
        const ratingB = b.average_rating || 0
        return ratingB - ratingA
      }
      return 0
    })

    return filtered
  }, [allTrainers, searchQuery, sortBy])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#050509] via-[#050509] to-[#0A0A0B] flex items-center justify-center">
        <div className="text-[#F8FAFC]">Cargando entrenadores...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050509] via-[#050509] to-[#0A0A0B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Botón Volver */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#A7AFBE] hover:text-[#F8FAFC] transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Volver a la página principal
          </Link>
        </div>
        
        {/* Hero / Destacado */}
        {featured && (
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#14161B] via-[#14161B] to-[#1F0F12] border border-[rgba(255,255,255,0.06)] mb-10 md:mb-14">
            <div className="absolute -right-20 -top-24 w-72 h-72 bg-[#FF2D2D]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative grid md:grid-cols-[1.1fr,0.9fr] gap-8 p-6 md:p-10 items-center">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-black/40 border border-white/10 px-3 py-1 text-xs font-medium text-[#E5E7EB] mb-4">
                  <Star className="w-3.5 h-3.5 text-[#FFD166]" />
                  Selección destacada de GymRatIA
                </p>
                <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-black text-[#F9FAFB] tracking-tight mb-4">
                  Elige tu <span className="text-[#FF2D2D]">entrenador</span> IA
                </h1>
                <p className="text-sm md:text-base text-[#A7AFBE] max-w-xl mb-6">
                  Crea una relación a largo plazo con un entrenador virtual que te conoce, adapta tus planes
                  y te aprieta cuando hace falta. Todo sin salir de tu móvil.
                </p>

                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-2 rounded-full bg-black/40 border border-[rgba(255,255,255,0.08)] px-3 py-1.5">
                    <Users className="w-4 h-4 text-[#FF2D2D]" />
                    <span className="text-xs text-[#E5E7EB]">Modo Alumno</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-black/40 border border-[rgba(255,255,255,0.08)] px-3 py-1.5">
                    <Sparkles className="w-4 h-4 text-[#FFB020]" />
                    <span className="text-xs text-[#E5E7EB]">Plan de {featured.cycle_weeks} semanas</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-black/40 border border-[rgba(255,255,255,0.08)] px-3 py-1.5">
                    <Target className="w-4 h-4 text-[#22C55E]" />
                    <span className="text-xs text-[#E5E7EB]">Alta adherencia · resultados reales</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/trainers/${featured.slug}`}
                    className="inline-flex items-center justify-center rounded-[18px] bg-[#FF2D2D] px-6 py-3 text-sm md:text-base font-semibold text-white shadow-[0_0_40px_rgba(255,45,45,0.35)] hover:bg-[#FF3D3D] transition-colors"
                  >
                    Ver perfil de {featured.isRealTrainer ? featured.trainer_name : featured.name}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                  {featured.isRealTrainer && featured.visibility_status === 'REQUEST_ACCESS' ? (
                    <div className="inline-flex items-center justify-center rounded-[18px] bg-transparent border border-[rgba(255,255,255,0.16)] px-5 py-3 text-sm md:text-base font-medium text-[#F9FAFB]">
                      Solicitud de acceso requerida
                    </div>
                  ) : (
                    <TrainerChatLink
                      trainerSlug={featured.slug}
                      trainerName={featured.isRealTrainer ? featured.trainer_name : featured.name}
                      variant="link"
                      className="inline-flex items-center justify-center rounded-[18px] bg-transparent border border-[rgba(255,255,255,0.16)] px-5 py-3 text-sm md:text-base font-medium text-[#F9FAFB] hover:border-[#FF2D2D]/70 hover:text-[#FFCDD2] transition-colors"
                    >
                      Hablar con el entrenador
                    </TrainerChatLink>
                  )}
                </div>
              </div>

              <Link href={`/trainers/${featured.slug}`} className="relative block cursor-pointer group">
                <div className="absolute inset-0 rounded-[26px] bg-gradient-to-tr from-[#FF2D2D]/20 via-transparent to-[#F97316]/20 blur-2xl" />
                <div className="relative rounded-[24px] bg-[#050509]/60 border border-[rgba(255,255,255,0.08)] p-5 flex flex-col gap-4 group-hover:border-[#FF2D2D]/50 transition-colors">
                  <div className="flex items-center gap-4">
                    {featured.isRealTrainer && featured.avatar_url ? (
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[rgba(255,255,255,0.1)] shadow-[0_18px_45px_rgba(0,0,0,0.55)]">
                        <SafeImage
                          src={featured.avatar_url}
                          alt={featured.trainer_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF2D2D] to-[#7F1D1D] flex items-center justify-center text-white font-heading font-bold text-2xl shadow-[0_18px_45px_rgba(0,0,0,0.55)]">
                        {featured.isRealTrainer ? featured.trainer_name[0] : (featured as TrainerFromPersonas).name[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#9CA3AF] mb-1">
                        Entrenador destacado
                      </p>
                      <h2 className="font-heading text-xl font-semibold text-[#F9FAFB] leading-tight">
                        {featured.isRealTrainer ? featured.trainer_name : featured.name}
                      </h2>
                      <p className="text-xs text-[#FFB3B3] font-medium mt-1">
                        {featured.isRealTrainer ? featured.description : featured.headline}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-lg font-heading font-bold text-[#F9FAFB]">
                        {featured.intensity}
                      </p>
                      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Intensidad</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-heading font-bold text-[#F9FAFB]">
                        {featured.flexibility}
                      </p>
                      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Flexibilidad</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-heading font-bold text-[#F9FAFB]">
                        {featured.cycle_weeks}
                      </p>
                      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Semanas</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Búsqueda y ordenamiento */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar entrenadores..."
                className="w-full pl-11 pr-4 py-3 rounded-[18px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] text-[#F9FAFB] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
              />
            </div>
            <div className="flex items-center gap-2 bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[18px] p-1">
              <button
                onClick={() => setSortBy('students')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sortBy === 'students'
                    ? 'bg-[#F9FAFB] text-[#050509]'
                    : 'text-[#9CA3AF] hover:text-[#E5E7EB]'
                }`}
              >
                Más alumnos
              </button>
              <button
                onClick={() => setSortBy('rating')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sortBy === 'rating'
                    ? 'bg-[#F9FAFB] text-[#050509]'
                    : 'text-[#9CA3AF] hover:text-[#E5E7EB]'
                }`}
              >
                Mejor valorado
              </button>
              <button
                onClick={() => setSortBy('name')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sortBy === 'name'
                    ? 'bg-[#F9FAFB] text-[#050509]'
                    : 'text-[#9CA3AF] hover:text-[#E5E7EB]'
                }`}
              >
                Nombre
              </button>
              <button
                onClick={() => setSortBy('intensity')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sortBy === 'intensity'
                    ? 'bg-[#F9FAFB] text-[#050509]'
                    : 'text-[#9CA3AF] hover:text-[#E5E7EB]'
                }`}
              >
                Intensidad
              </button>
              <button
                onClick={() => setSortBy('flexibility')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sortBy === 'flexibility'
                    ? 'bg-[#F9FAFB] text-[#050509]'
                    : 'text-[#9CA3AF] hover:text-[#E5E7EB]'
                }`}
              >
                Flexibilidad
              </button>
            </div>
          </div>
        </div>

        {/* Grid de entrenadores */}
        {filteredAndSortedTrainers.length === 0 ? (
          <div className="text-center py-10 rounded-3xl border border-dashed border-[rgba(255,255,255,0.14)] bg-[#050509]">
            <p className="text-sm text-[#9CA3AF] mb-1">No se encontraron entrenadores con ese criterio.</p>
            <p className="text-xs text-[#6B7280]">Prueba con otro objetivo o palabra clave.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedTrainers.map((trainer) => {
              const name = trainer.isRealTrainer ? trainer.trainer_name : trainer.name
              const headline = trainer.isRealTrainer ? trainer.description : trainer.headline
              const activeStudents = trainer.active_students || 0
              const rating = trainer.average_rating || 0
              const totalRatings = trainer.total_ratings || 0

              // Crear una key única combinando slug y si es real trainer
              const uniqueKey = `${trainer.slug}-${trainer.isRealTrainer ? 'real' : 'persona'}`

              return (
                <Link
                  key={uniqueKey}
                  href={`/trainers/${trainer.slug}`}
                  className="group relative overflow-hidden rounded-[22px] bg-[#050509] border border-[rgba(255,255,255,0.12)] hover:border-[#FF2D2D]/70 transition-colors shadow-[0_18px_45px_rgba(0,0,0,0.65)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-[#FF2D2D]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-5 flex flex-col gap-4 h-full">
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        {trainer.isRealTrainer && trainer.avatar_url ? (
                          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.1)] shadow-[0_15px_35px_rgba(0,0,0,0.7)] group-hover:scale-105 transition-transform">
                            <SafeImage
                              src={trainer.avatar_url}
                              alt={name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF2D2D] to-[#7F1D1D] flex items-center justify-center text-white font-heading font-bold text-xl shadow-[0_15px_35px_rgba(0,0,0,0.7)] group-hover:scale-105 transition-transform">
                            {name[0]}
                          </div>
                        )}
                        {!trainer.isRealTrainer && (
                          <div className="absolute -bottom-1 -right-1 rounded-full bg-[#050509] px-1.5 py-0.5 border border-[rgba(255,255,255,0.18)]">
                            <span className="text-[9px] text-[#E5E7EB] uppercase tracking-[0.16em]">IA</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] mb-1">
                          {trainer.isRealTrainer ? 'Entrenador' : 'Entrenador virtual'}
                        </p>
                        <h2 className="font-heading text-lg font-semibold text-[#F9FAFB] leading-tight truncate">
                          {name}
                        </h2>
                        <p className="text-[11px] text-[#FFB3B3] font-medium mb-1.5 line-clamp-1">
                          {headline}
                        </p>
                        <p className="text-[11px] text-[#A7AFBE] line-clamp-2">{trainer.philosophy}</p>
                      </div>
                    </div>

                    {/* Señales virales - Valoración y alumnos activos */}
                    <div className="flex items-center gap-4 text-xs">
                      {activeStudents > 0 && (
                        <div className="flex items-center gap-1.5 text-[#FF2D2D]">
                          <Users className="w-3.5 h-3.5" />
                          <span className="font-medium">{activeStudents} {activeStudents === 1 ? 'alumno' : 'alumnos'}</span>
                        </div>
                      )}
                      {rating > 0 && totalRatings > 0 && (
                        <div className="flex items-center gap-1.5 text-[#FFD166]">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="font-medium">
                            {rating.toFixed(1)} ({totalRatings})
                          </span>
                        </div>
                      )}
                      {rating === 0 && totalRatings === 0 && (
                        <div className="flex items-center gap-1.5 text-[#6B7280]">
                          <Star className="w-3.5 h-3.5" />
                          <span className="font-medium">Sin valoraciones</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-[14px] bg-[#0A0A0B] border border-[rgba(255,255,255,0.09)] px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Target className="w-3.5 h-3.5 text-[#FF2D2D]" />
                          <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">Intensidad</span>
                        </div>
                        <p className="font-heading text-base font-semibold text-[#F9FAFB]">
                          {trainer.intensity}
                          <span className="text-[10px] text-[#6B7280]">/10</span>
                        </p>
                      </div>
                      <div className="rounded-[14px] bg-[#0A0A0B] border border-[rgba(255,255,255,0.09)] px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#22C55E]" />
                          <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">
                            Flexibilidad
                          </span>
                        </div>
                        <p className="font-heading text-base font-semibold text-[#F9FAFB]">
                          {trainer.flexibility}
                          <span className="text-[10px] text-[#6B7280]">/10</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-[rgba(255,255,255,0.12)]">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#A7AFBE]">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Bloque de {trainer.cycle_weeks} semanas</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#FFB3B3] group-hover:text-[#FFE4E6] transition-colors">
                        <span className="font-medium">Ver perfil</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div className="mt-10 text-center">
          <p className="text-xs text-[#9CA3AF]">
            ¿Eres entrenador?{' '}
            <Link href="/trainers/register" className="text-[#FFB3B3] hover:text-white underline-offset-4 hover:underline">
              Únete a la plataforma de GymRatIA
            </Link>
          </p>
        </div>
      </div>
      <AppFooter />
    </div>
  )
}
