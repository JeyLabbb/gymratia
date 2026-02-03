'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'

const ALLOWED_PATHS = ['/auth/login', '/auth/callback', '/auth/accept-terms', '/terms', '/auth/mode-select', '/onboarding', '/privacy']

function isProfileComplete(profile: { height_cm?: number | null; goal?: string | null } | null): boolean {
  if (!profile) return false
  return profile.height_cm != null && profile.goal != null && String(profile.goal).trim() !== ''
}

export function TermsGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (authLoading || !user) return
    if (ALLOWED_PATHS.some((p) => pathname?.startsWith(p))) return

    let cancelled = false
    setChecking(true)

    const checkTermsAndOnboarding = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || cancelled) return

        const res = await fetch('/api/user/profile', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok || cancelled) return

        const data = await res.json()
        const profile = data.profile
        const hasTerms = profile?.terms_accepted_at != null

        if (!cancelled && !hasTerms) {
          router.replace('/auth/accept-terms')
          return
        }

        // Si tiene términos pero perfil incompleto: redirigir según modo (entrenador vs alumno)
        const mode = typeof window !== 'undefined' ? localStorage.getItem('user_mode') || 'student' : 'student'
        const { data: trainer } = await supabase.from('trainers').select('id').eq('user_id', session.user.id).maybeSingle()
        const hasTrainerProfile = !!trainer?.id

        if (!cancelled && hasTerms && !isProfileComplete(profile)) {
          if (mode === 'trainer') {
            router.replace(hasTrainerProfile ? '/trainers/dashboard' : '/trainers/register?step=2')
          } else {
            router.replace('/onboarding/basic')
          }
        }
      } catch {
        // Ignore errors, don't block
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    checkTermsAndOnboarding()
    return () => {
      cancelled = true
    }
  }, [user, authLoading, pathname, router])

  return <>{children}</>
}
