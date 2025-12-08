'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'
import { ArrowRight } from 'lucide-react'

type UserProfile = {
  full_name?: string
  email?: string
}

export function PersonalizedHero() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && !authLoading) {
      loadProfile()
    } else {
      setLoading(false)
    }
  }, [user, authLoading])

  const loadProfile = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

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

  const handleStartClick = () => {
    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/auth/login')
    }
  }

  const userName = profile?.full_name || user?.email?.split('@')[0] || null
  const displayName = userName ? userName.split(' ')[0] : null

  return (
    <div className="space-y-6">
      <p className="text-xs tracking-[0.18em] text-[#A7AFBE] uppercase">
        {user ? 'BIENVENIDO DE VUELTA' : 'PLANES 100% PERSONALIZADOS'}
      </p>
      <h1 className="font-heading text-[44px] md:text-[72px] leading-[0.95] font-black uppercase">
        {user && displayName ? (
          <>
            <span className="text-[#F8FAFC]">HOLA,</span><br />
            <span className="text-[#FF2D2D]">{displayName.toUpperCase()}</span><br />
            <span className="text-[#F8FAFC]">CONTINÚA TU</span><br />
            <span className="text-[#FF2D2D]">TRANSFORMACIÓN</span>
          </>
        ) : (
          <>
            <span className="text-[#F8FAFC]">TRANSFORMA</span><br />
            <span className="text-[#FF2D2D]">TU CUERPO</span><br />
            <span className="text-[#F8FAFC]">CON IA</span>
          </>
        )}
      </h1>
      <p className="text-lg text-[#A7AFBE] max-w-[520px]">
        {user
          ? 'Sigue tu progreso, chatea con tu entrenador y alcanza tus objetivos.'
          : 'Entrena con un coach con personalidad propia. 9 semanas de progresión real adaptadas a tu objetivo, tu tiempo y tus limitaciones.'}
      </p>
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <button
          onClick={handleStartClick}
          className="inline-flex items-center justify-center rounded-[16px] font-medium transition-all bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] shadow-[0_0_40px_rgba(255,45,45,0.25)] px-8 py-4 text-lg"
        >
          {user ? 'Ir a mi dashboard' : 'Comienza tu transformación'}
          <ArrowRight className="ml-2 h-5 w-5" />
        </button>
        {!user && (
          <a
            href="/trainers"
            className="inline-flex items-center justify-center rounded-[16px] font-medium transition-all text-[#F8FAFC] hover:bg-[#14161B] border border-[rgba(255,255,255,0.08)] px-8 py-4 text-lg"
          >
            Ver entrenadores
          </a>
        )}
      </div>
    </div>
  )
}


