'use client'

import { useState, useEffect } from 'react'
import { personas } from '@/lib/personas'
import { supabase } from '@/lib/supabase'
import { Star, Users } from 'lucide-react'
import SafeImage from './SafeImage'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto max-w-[1200px] px-5 md:px-8', className)}>
      {children}
    </div>
  )
}

function Card({ 
  children, 
  variant = 'surface',
  className 
}: { 
  children: React.ReactNode
  variant?: 'surface' | 'surfaceAccentOutline' | 'outlineAccent' | 'darkTile' | 'accentTile'
  className?: string 
}) {
  const variants = {
    surface: 'bg-[#14161B] border border-[rgba(255,255,255,0.08)]',
    surfaceAccentOutline: 'bg-[#14161B] border border-[#FF2D2D]',
    outlineAccent: 'bg-transparent border border-[rgba(255,45,45,0.3)] hover:border-[#FF2D2D]',
    darkTile: 'bg-[#1A1D24] border border-[rgba(255,255,255,0.08)]',
    accentTile: 'bg-[#1A1D24] border border-[#FF2D2D]'
  }
  return (
    <div className={cn('rounded-[22px] p-6 transition-all', variants[variant], className)}>
      {children}
    </div>
  )
}

function Button({ 
  children, 
  href, 
  variant = 'accentSolid', 
  size = 'md',
  className,
  ...props 
}: { 
  children: React.ReactNode
  href?: string
  variant?: 'accentSolid' | 'ghost' | 'accentOutline'
  size?: 'md' | 'xl'
  className?: string
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const baseStyles = 'inline-flex items-center justify-center rounded-[16px] font-medium transition-all'
  const variants = {
    accentSolid: 'bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] shadow-[0_0_40px_rgba(255,45,45,0.25)]',
    ghost: 'text-[#F8FAFC] hover:bg-[#14161B] border border-[rgba(255,255,255,0.08)]',
    accentOutline: 'text-[#FF2D2D] border border-[#FF2D2D] hover:bg-[rgba(255,45,45,0.12)]'
  }
  const sizes = {
    md: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  }

  const classes = cn(baseStyles, variants[variant], sizes[size], className)
  
  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    )
  }
  
  return <a className={classes} {...props}>{children}</a>
}

type TrainerWithAvatar = {
  slug: string
  name: string
  headline: string
  avatar_url?: string
  average_rating?: number
  total_ratings?: number
  active_students?: number
}

export function TrainersPreviewClient() {
  const [trainersWithAvatars, setTrainersWithAvatars] = useState<TrainerWithAvatar[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTrainers = async () => {
      try {
        const personaTrainers = personas.filter(t => t.is_active !== false).slice(0, 2)
        
        // Cargar avatares y estadísticas desde BD para cada entrenador (jey, edu, carolina son separados)
        const trainersPromises = personaTrainers.map(async (trainer) => {
          try {
            const { data: trainerData } = await supabase
              .from('trainers')
              .select('avatar_url, average_rating, total_ratings, active_students')
              .eq('slug', trainer.slug)
              .maybeSingle()
            
            return {
              slug: trainer.slug,
              name: trainer.name,
              headline: trainer.headline,
              avatar_url: trainerData?.avatar_url || undefined,
              average_rating: trainerData?.average_rating || 0,
              total_ratings: trainerData?.total_ratings || 0,
              active_students: trainerData?.active_students || 0
            }
          } catch (error) {
            console.error(`Error loading data for ${trainer.slug}:`, error)
            return {
              slug: trainer.slug,
              name: trainer.name,
              headline: trainer.headline,
              avatar_url: undefined,
              average_rating: 0,
              total_ratings: 0,
              active_students: 0
            }
          }
        })
        
        const trainers = await Promise.all(trainersPromises)
        setTrainersWithAvatars(trainers)
      } catch (error) {
        console.error('Error loading trainers:', error)
        // Fallback a solo personas si falla
        const personaTrainers = personas.filter(t => t.is_active !== false).slice(0, 2)
        setTrainersWithAvatars(personaTrainers.map(t => ({
          slug: t.slug,
          name: t.name,
          headline: t.headline,
          avatar_url: undefined,
          average_rating: 0,
          total_ratings: 0,
          active_students: 0
        })))
      } finally {
        setLoading(false)
      }
    }
    
    loadTrainers()
  }, [])

  if (loading) {
    return (
      <section className="py-[72px]">
        <Container>
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-black uppercase mb-4">
              NUESTROS <span className="text-[#FF2D2D]">ENTRENADORES</span>
            </h2>
            <p className="text-[#A7AFBE] text-lg">Elige el estilo que mejor encaje contigo.</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#FF2D2D] border-t-transparent rounded-full animate-spin" />
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section className="py-[72px]">
      <Container>
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-black uppercase mb-4">
            NUESTROS <span className="text-[#FF2D2D]">ENTRENADORES</span>
          </h2>
          <p className="text-[#A7AFBE] text-lg">Elige el estilo que mejor encaje contigo.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
          {trainersWithAvatars.map((trainer) => (
            <Card key={trainer.slug} variant="surface" className="text-center">
              {trainer.avatar_url ? (
                <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-2 border-[#FF2D2D]">
                  <SafeImage
                    src={trainer.avatar_url}
                    alt={trainer.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#1A1D24] mx-auto mb-4 flex items-center justify-center text-3xl font-heading">
                  {trainer.name[0]}
                </div>
              )}
              <h3 className="font-heading text-2xl font-bold mb-2">{trainer.name}</h3>
              <p className="text-[#FF2D2D] text-sm mb-3">{trainer.headline}</p>
              
              {/* Valoración y alumnos activos */}
              <div className="flex items-center justify-center gap-4 mb-4 text-xs">
                {trainer.average_rating > 0 && trainer.total_ratings > 0 && (
                  <div className="flex items-center gap-1.5 text-[#FFD166]">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-medium">
                      {trainer.average_rating.toFixed(1)} ({trainer.total_ratings})
                    </span>
                  </div>
                )}
                {trainer.active_students > 0 && (
                  <div className="flex items-center gap-1.5 text-[#FF2D2D]">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">{trainer.active_students} {trainer.active_students === 1 ? 'alumno' : 'alumnos'}</span>
                  </div>
                )}
              </div>
              <Button 
                href={`/trainers/${trainer.slug}`} 
                variant="accentSolid" 
                size="md"
                className="w-full"
              >
                Ver perfil de {trainer.name}
              </Button>
            </Card>
          ))}
        </div>
        <div className="text-center">
          <Button href="/trainers" variant="accentOutline" size="md">
            Ver todos los entrenadores
          </Button>
        </div>
      </Container>
    </section>
  )
}
