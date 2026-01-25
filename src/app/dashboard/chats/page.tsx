'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { personas } from '@/lib/personas'
import Link from 'next/link'
import { 
  MessageCircle, 
  Calendar,
  ArrowRight,
  Zap,
  Plus
} from 'lucide-react'
import { DashboardLayout } from '@/app/_components/DashboardLayout'
import { LoadingScreen } from '@/app/_components/LoadingScreen'
import { TrainerChatLink } from '@/app/_components/TrainerChatLink'

type TrainerChat = {
  id: string
  trainer_slug: 'edu' | 'carolina'
  created_at: string
  updated_at: string
  last_message_at?: string
}

export default function ChatsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<TrainerChat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadChats()
    }
  }, [user])

  const loadChats = async () => {
    if (!user) return

    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return null
  }

  const getTrainerChat = (slug: 'edu' | 'carolina') => {
    return chats.find((c) => c.trainer_slug === slug)
  }

  return (
    <DashboardLayout activeSection="chat">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
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
            {personas.filter(t => t.is_active !== false).map((trainer) => {
              const chat = getTrainerChat(trainer.slug as 'edu' | 'carolina' | 'jey')
              return (
                <TrainerChatLink
                  key={trainer.slug}
                  trainerSlug={trainer.slug}
                  trainerName={trainer.name}
                  variant="link"
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
                </TrainerChatLink>
              )
            })}
          </div>

          {chats.length === 0 && (
            <div className="mt-8 text-center py-12 bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px]">
              <MessageCircle className="w-12 h-12 text-[#A7AFBE] mx-auto mb-4" />
              <p className="text-[#A7AFBE] mb-4">Aún no tienes conversaciones con entrenadores</p>
              <Link
                href="/trainers"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[12px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Seleccionar entrenador
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
