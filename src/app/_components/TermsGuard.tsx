'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'

const ALLOWED_PATHS = ['/auth/login', '/auth/callback', '/auth/accept-terms', '/terms', '/auth/mode-select']

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

    const checkTerms = async () => {
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
        }
      } catch {
        // Ignore errors, don't block
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    checkTerms()
    return () => {
      cancelled = true
    }
  }, [user, authLoading, pathname, router])

  return <>{children}</>
}
