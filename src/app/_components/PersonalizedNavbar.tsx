'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { StartButton } from './StartButton'

type UserProfile = {
  full_name?: string
}

export function PersonalizedNavbar() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (user && !authLoading) {
      loadProfile()
    }
  }, [user, authLoading])

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
    }
  }

  const userName = profile?.full_name || user?.email?.split('@')[0] || null
  const displayName = userName ? userName.split(' ')[0] : null

  return (
    <nav className="sticky top-0 z-50 h-[72px] border-b border-[rgba(255,255,255,0.08)] bg-[#0A0A0B]/80 backdrop-blur-sm">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8 flex items-center justify-between h-full">
        <Link href="/" className="text-xl font-heading font-extrabold tracking-tight">
          GymRat<span className="text-[#FF2D2D]">IA</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-[#F8FAFC] hover:text-[#FF2D2D] transition-colors text-sm">Inicio</Link>
          {user && (
            <Link href="/dashboard" className="text-[#F8FAFC] hover:text-[#FF2D2D] transition-colors text-sm">Dashboard</Link>
          )}
          <Link href="/trainers" className="text-[#F8FAFC] hover:text-[#FF2D2D] transition-colors text-sm">Entrenadores</Link>
          <Link href="#testimonials" className="text-[#F8FAFC] hover:text-[#FF2D2D] transition-colors text-sm">Testimonios</Link>
        </div>
        <div className="flex items-center gap-4">
          {user && displayName && (
            <span className="hidden md:block text-sm text-[#A7AFBE]">
              Hola, <span className="text-[#FF2D2D] font-medium">{displayName}</span>
            </span>
          )}
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-[16px] font-medium transition-all bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] shadow-[0_0_40px_rgba(255,45,45,0.25)] px-6 py-3 text-base"
            >
              Mi Dashboard
            </Link>
          ) : (
            <StartButton text="Comenzar" size="md" showArrow={false} />
          )}
        </div>
      </div>
    </nav>
  )
}


