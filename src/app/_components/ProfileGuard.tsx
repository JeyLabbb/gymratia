'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'
import { User, GraduationCap, ArrowRight } from 'lucide-react'
import Link from 'next/link'

type ProfileGuardProps = {
  mode: 'student' | 'trainer'
  children: React.ReactNode
}

export function ProfileGuard({ mode, children }: ProfileGuardProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/auth/login')
      return
    }

    checkProfile()
  }, [user, authLoading, mode])

  const checkProfile = async () => {
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

      if (mode === 'student') {
        // Verificar perfil de alumno
        const response = await fetch('/api/user/profile', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const data = await response.json()
        setHasProfile(!!data.profile)
      } else {
        // Verificar perfil de entrenador
        const { data: trainer } = await supabase
          .from('trainers')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle()
        setHasProfile(!!trainer)
      }
    } catch (error) {
      console.error('Error checking profile:', error)
      setHasProfile(false)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF2D2D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#A7AFBE]">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!hasProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#050509] via-[#050509] to-[#0A0A0B] flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            {mode === 'student' ? (
              <div className="w-24 h-24 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center mx-auto mb-6">
                <User className="w-12 h-12 text-[#FF2D2D]" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="w-12 h-12 text-[#FF2D2D]" />
              </div>
            )}
            <h1 className="font-heading text-3xl md:text-4xl font-black text-[#F8FAFC] mb-4">
              {mode === 'student' ? 'Completa tu perfil de alumno' : 'Crea tu perfil de entrenador'}
            </h1>
            <p className="text-lg text-[#A7AFBE] mb-8">
              {mode === 'student' 
                ? 'Para usar el modo alumno, necesitas completar tu perfil con información básica.'
                : 'Para usar el modo entrenador, necesitas crear tu perfil de entrenador.'}
            </p>
          </div>
          <Link
            href={mode === 'student' ? '/onboarding/basic' : (user ? '/trainers/register?step=2' : '/trainers/register')}
            className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#FF2D2D] px-8 py-4 text-base font-semibold text-white hover:bg-[#FF3D3D] transition-colors shadow-[0_0_40px_rgba(255,45,45,0.25)]"
          >
            {mode === 'student' ? 'Completar perfil' : 'Crear perfil de entrenador'}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

