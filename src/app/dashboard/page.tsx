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
import { DashboardLayout } from '@/app/_components/DashboardLayout'

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
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<TrainerChat[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadChats()
      loadProfile()
    }
  }, [user])

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
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
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

  const getTrainerChat = (slug: 'edu' | 'carolina') => {
    return chats.find((c) => c.trainer_slug === slug)
  }

  const displayName = profile?.preferred_name || profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario'
  const hasActivePlan = profile?.goal && profile?.weight_kg && profile?.height_cm
  const activeTrainers = chats.length

  return (
    <DashboardLayout activeSection="dashboard">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-[#FF2D2D]/10 to-[#FF2D2D]/5 border border-[#FF2D2D]/20 rounded-[22px] p-6">
            <h1 className="font-heading text-3xl font-bold text-[#F8FAFC] mb-2">
              ¡Hola, {displayName}! 👋
            </h1>
            <p className="text-[#A7AFBE]">
              Continúa tu transformación. Aquí tienes un resumen de tu progreso.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="/dashboard/profile"
              className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center group-hover:bg-[#FF2D2D]/30 transition-colors">
                  <TrendingUp className="w-6 h-6 text-[#FF2D2D]" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-heading font-bold text-[#F8FAFC]">
                    {profile?.weight_kg ? `${profile.weight_kg} kg` : '--'}
                  </p>
                  <p className="text-sm text-[#A7AFBE]">Peso actual</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#FF2D2D] group-hover:gap-3 transition-all">
                <span>Ver progreso</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-[#FF2D2D]" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-heading font-bold text-[#F8FAFC]">{activeTrainers}</p>
                  <p className="text-sm text-[#A7AFBE]">Entrenadores activos</p>
                </div>
              </div>
            </div>

            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center">
                  {hasActivePlan ? (
                    <Award className="w-6 h-6 text-[#FF2D2D]" />
                  ) : (
                    <Target className="w-6 h-6 text-[#A7AFBE]" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-heading font-bold text-[#F8FAFC]">
                    {hasActivePlan ? 'Activo' : 'Pendiente'}
                  </p>
                  <p className="text-sm text-[#A7AFBE]">Plan de entrenamiento</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trainers Section - Mis Chats */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-2xl font-bold text-[#F8FAFC]">Mis Entrenadores</h2>
              <Link
                href="/trainers"
                className="text-sm text-[#FF2D2D] hover:text-[#FF3D3D] transition-colors flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {personas.map((trainer) => {
                const chat = getTrainerChat(trainer.slug as 'edu' | 'carolina')
                return (
                  <Link
                    key={trainer.slug}
                    href={`/dashboard/chat/${trainer.slug}${chat ? `?chatId=${chat.id}` : ''}`}
                    className="block bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                        {trainer.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-heading text-xl font-bold text-[#F8FAFC]">
                            {trainer.name}
                          </h3>
                          {chat && (
                            <div className="w-2 h-2 rounded-full bg-[#FF2D2D] animate-pulse" />
                          )}
                        </div>
                        <p className="text-sm text-[#A7AFBE] mb-2">{trainer.headline}</p>
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
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-6">Accesos Rápidos</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Link
                href="/dashboard/profile"
                className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center group-hover:bg-[#FF2D2D]/30 transition-colors">
                    <User className="w-6 h-6 text-[#FF2D2D]" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Mi Perfil</h3>
                    <p className="text-xs text-[#A7AFBE]">Datos y progreso</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#FF2D2D] group-hover:gap-3 transition-all">
                  <span>Ver perfil</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              <Link
                href="/dashboard/workouts"
                className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center group-hover:bg-[#FF2D2D]/30 transition-colors">
                    <Dumbbell className="w-6 h-6 text-[#FF2D2D]" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Entrenamientos</h3>
                    <p className="text-xs text-[#A7AFBE]">Rutinas y planes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#FF2D2D] group-hover:gap-3 transition-all">
                  <span>Ver rutinas</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              <Link
                href="/dashboard/diet"
                className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center group-hover:bg-[#FF2D2D]/30 transition-colors">
                    <UtensilsCrossed className="w-6 h-6 text-[#FF2D2D]" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Dieta</h3>
                    <p className="text-xs text-[#A7AFBE]">Nutrición y productos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#FF2D2D] group-hover:gap-3 transition-all">
                  <span>Ver dieta</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
