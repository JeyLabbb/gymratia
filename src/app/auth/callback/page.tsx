'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      
      if (code) {
        // Exchange code for session (this will set cookies automatically)
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.session) {
          // Check if user has profile
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', data.session.user.id)
            .single()

          if (!profile) {
            // Create basic profile from OAuth data
            await supabase.from('user_profiles').insert({
              user_id: data.session.user.id,
              email: data.session.user.email,
              full_name: data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name,
              avatar_url: data.session.user.user_metadata?.avatar_url,
            })
            router.push('/onboarding/basic')
          } else {
            router.push('/dashboard')
          }
        } else {
          router.push('/auth/login')
        }
      } else {
        router.push('/auth/login')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
      <div className="text-center">
        <div className="text-[#F8FAFC] mb-2">Completando inicio de sesión...</div>
        <div className="text-sm text-[#A7AFBE]">Por favor espera</div>
      </div>
    </div>
  )
}


