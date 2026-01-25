'use client'

import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useEffect, use } from 'react'
import { useAuth } from '@/app/_components/AuthProvider'
import { ChatGPTStyleChat } from '@/app/_components/ChatGPTStyleChat'
import { DashboardLayout } from '@/app/_components/DashboardLayout'
import { LoadingScreen } from '@/app/_components/LoadingScreen'

export default function ChatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const chatId = searchParams.get('chatId') || undefined
  
  // Unwrap params Promise using React.use()
  const { slug } = use(params)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return null
  }

  // Aceptar 'jey', 'edu' y 'carolina' como entrenadores separados
  let trainerSlug: 'edu' | 'carolina' | 'jey' | null = null
  
  if (slug === 'jey' || slug === 'edu' || slug === 'carolina') {
    trainerSlug = slug as 'edu' | 'carolina' | 'jey'
  }

  if (!trainerSlug) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-[#F8FAFC]">Trainer no encontrado</div>
      </div>
    )
  }

  return (
    <DashboardLayout activeSection="chat">
      <ChatGPTStyleChat trainerSlug={trainerSlug} chatId={chatId} />
    </DashboardLayout>
  )
}

