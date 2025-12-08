'use client'

import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useEffect, use } from 'react'
import { useAuth } from '@/app/_components/AuthProvider'
import { ChatGPTStyleChat } from '@/app/_components/ChatGPTStyleChat'
import { DashboardLayout } from '@/app/_components/DashboardLayout'

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
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-[#F8FAFC]">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const trainerSlug = slug === 'edu' ? 'edu' : slug === 'carolina' ? 'carolina' : null

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

