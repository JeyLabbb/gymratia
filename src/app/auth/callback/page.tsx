'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      
      if (error) {
        console.error('Error en OAuth callback:', error, errorDescription)
        router.push(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`)
        return
      }
      
      if (code) {
        try {
          // Exchange code for session (this will set cookies automatically)
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            console.error('Error intercambiando código por sesión:', exchangeError)
            router.push(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`)
            return
          }

          if (data.session) {
            // Check if user has profile
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', data.session.user.id)
              .single()

            if (profileError && profileError.code !== 'PGRST116') {
              // PGRST116 means no rows returned, which is fine for new users
              console.error('Error verificando perfil:', profileError)
            }

            // Verificar si viene del registro de entrenador
            const registeringAsTrainer = typeof window !== 'undefined' 
              ? localStorage.getItem('registering_as_trainer') === 'true'
              : false
            
            // Verificar si tiene perfil de entrenador
            const { data: trainerProfile } = await supabase
              .from('trainers')
              .select('id')
              .eq('user_id', data.session.user.id)
              .maybeSingle()
            
            const savedMode = typeof window !== 'undefined' ? (localStorage.getItem('user_mode') || 'student') : 'student'
            const hasTrainerProfile = !!trainerProfile
            const hasStudentProfile = !!profile
            
            // Limpiar flag si existe
            if (typeof window !== 'undefined') {
              localStorage.removeItem('registering_as_trainer')
            }
            
            // Si no tiene perfil de alumno, crear uno básico desde OAuth
            if (!profile) {
              const { error: insertError } = await supabase.from('user_profiles').insert({
                user_id: data.session.user.id,
                email: data.session.user.email,
                full_name: data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name,
                avatar_url: data.session.user.user_metadata?.avatar_url,
              })
              
              if (insertError) {
                console.error('Error creando perfil:', insertError)
                // Continue anyway, user can complete profile later
              }
            }
            
            // Redirigir a la página principal según el modo elegido
            if (registeringAsTrainer || savedMode === 'trainer') {
              localStorage.setItem('user_mode', 'trainer')
              router.push('/')
            } else {
              localStorage.setItem('user_mode', 'student')
              router.push('/')
            }
          } else {
            console.error('No se obtuvo sesión después del intercambio')
            router.push('/auth/login?error=No se pudo establecer la sesión')
          }
        } catch (err: any) {
          console.error('Error en handleCallback:', err)
          router.push(`/auth/login?error=${encodeURIComponent(err.message || 'Error desconocido')}`)
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

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
          <div className="text-[#F8FAFC]">Completando inicio de sesión...</div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  )
}


