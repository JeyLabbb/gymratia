'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function LoginContent() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, loading: authLoading, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Check for error in URL (from OAuth callback)
  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }
  }, [searchParams])

  // Marcar modo desde URL (ej: ?mode=trainer cuando viene de trainers/register)
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'trainer' && typeof window !== 'undefined') {
      localStorage.setItem('user_mode', 'trainer')
    } else if (mode === 'student' && typeof window !== 'undefined') {
      localStorage.setItem('user_mode', 'student')
    }
  }, [searchParams])

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      // Small delay to ensure session is fully established
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // Verificar si hay un redirect en la URL
          const redirect = searchParams.get('redirect')
          if (redirect) {
            router.push(redirect)
            return
          }

          // Verificar si tiene perfil de alumno
          const profileRes = await fetch('/api/user/profile', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })
          const profileData = await profileRes.json()
          
          // Verificar si tiene perfil de entrenador
          const { data: trainer } = await supabase
            .from('trainers')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle()
          
          const savedMode = localStorage.getItem('user_mode') || 'student'
          const hasTrainerProfile = !!trainer
          const hasStudentProfile = !!profileData.profile
          
          // Redirigir a la página principal según el modo elegido
          if (savedMode === 'trainer') {
            localStorage.setItem('user_mode', 'trainer')
            router.push('/')
          } else {
            localStorage.setItem('user_mode', 'student')
            router.push('/')
          }
        }
      }, 500)
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (isSignUp && !termsAccepted) {
      setError('Debes aceptar los Términos y Condiciones para crear una cuenta.')
      return
    }
    setLoading(true)

    try {
      if (isSignUp) {
        try {
          await signUpWithEmail(email, password, fullName)
          // Signup exitoso. Supabase puede requerir confirmación de email.
          await new Promise(resolve => setTimeout(resolve, 500))
          try {
            await signInWithEmail(email, password)
          } catch (signInErr: any) {
            // Si falla por "Email not confirmed", el usuario debe revisar su correo
            if (signInErr.message?.includes('Email not confirmed') ||
                signInErr.message?.includes('email_not_confirmed')) {
              setError('Revisa tu email y haz clic en el enlace para confirmar tu cuenta. Luego podrás iniciar sesión.')
              setLoading(false)
              return
            }
            throw signInErr
          }
        } catch (signUpError: any) {
          // Manejar errores específicos de signup
          if (signUpError.message?.includes('already registered') || 
              signUpError.message?.includes('already exists') ||
              signUpError.message?.includes('User already registered')) {
            setError('Esta cuenta ya existe. Inicia sesión en su lugar.')
            setIsSignUp(false)
            setLoading(false)
            return
          }
          if (signUpError.message?.includes('signup_disabled') || signUpError.message?.includes('Signup disabled')) {
            setError('El registro por email está desactivado. Usa Google para crear una cuenta.')
            setLoading(false)
            return
          }
          throw signUpError
        }
      } else {
        try {
          await signInWithEmail(email, password)
        } catch (signInError: any) {
          const msg = signInError.message || ''
          if (msg.includes('Invalid login credentials') || msg.includes('not found') || msg.includes('Invalid')) {
            setError('Email o contraseña incorrectos. Si no tienes cuenta, crea una nueva. Si usaste Google para registrarte, inicia sesión con Google.')
            setLoading(false)
            return
          }
          if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
            setError('Confirma tu cuenta: revisa tu email y haz clic en el enlace antes de iniciar sesión.')
            setLoading(false)
            return
          }
          throw signInError
        }
      }
      
      // Wait a bit for session to be established
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Check if user has profile
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Error obteniendo sesión:', sessionError)
        setError(sessionError.message || 'Error al obtener la sesión')
        setLoading(false)
        return
      }
      
      if (session) {
        const profileRes = await fetch('/api/user/profile', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const profileData = await profileRes.json()
        
        // Verificar si tiene perfil de entrenador
        const { data: trainer } = await supabase
          .from('trainers')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle()
        
        const savedMode = localStorage.getItem('user_mode') || 'student'
        const hasTrainerProfile = !!trainer
        const hasStudentProfile = !!profileData.profile
        
        // Redirigir a la página principal según el modo elegido
        if (savedMode === 'trainer') {
          localStorage.setItem('user_mode', 'trainer')
          router.push('/')
        } else {
          localStorage.setItem('user_mode', 'student')
          router.push('/')
        }
      } else {
        setError('No se pudo establecer la sesión. Por favor intenta de nuevo.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Error en handleSubmit:', err)
      setError(err.message || 'Error al iniciar sesión')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      console.log('Iniciando login con Google...')
      await signInWithGoogle()
      // Note: signInWithGoogle will redirect, so we don't set loading to false here
      // If we reach here without redirect, there was an error
      setTimeout(() => {
        setLoading(false)
      }, 2000)
    } catch (err: any) {
      console.error('Error en handleGoogleSignIn:', err)
      setError(err.message || 'Error al iniciar sesión con Google. Verifica que OAuth esté configurado en Supabase.')
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-[#F8FAFC]">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-heading font-extrabold tracking-tight">
            GymRat<span className="text-[#FF2D2D]">IA</span>
          </Link>
        </div>

        <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-8">
          <h1 className="font-heading text-2xl font-bold mb-6 text-center">
            {isSignUp ? 'Crear cuenta en GymRatIA' : 'Iniciar sesión en GymRatIA'}
          </h1>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2">Nombre completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                  placeholder="Tu nombre"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-[#A7AFBE] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm text-[#A7AFBE] mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                placeholder="••••••••"
              />
            </div>

            {isSignUp && (
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 rounded border-[rgba(255,255,255,0.2)] bg-[#1A1D24] text-[#FF2D2D] focus:ring-[#FF2D2D]"
                />
                <span className="text-sm text-[#A7AFBE] group-hover:text-[#F8FAFC] transition-colors">
                  He leído y acepto los{' '}
                  <Link href="/terms" target="_blank" className="text-[#FF2D2D] hover:underline">
                    Términos y Condiciones
                  </Link>
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[16px] bg-[#FF2D2D] text-[#F8FAFC] px-6 py-3 font-medium hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cargando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[rgba(255,255,255,0.08)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#14161B] text-[#A7AFBE]">O continúa con</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="mt-4 w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] px-6 py-3 font-medium hover:bg-[#1F2229] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-[#A7AFBE]">
            {isSignUp ? (
              <>
                ¿Ya tienes cuenta?{' '}
                <button onClick={() => setIsSignUp(false)} className="text-[#FF2D2D] hover:underline">
                  Inicia sesión
                </button>
              </>
            ) : (
              <>
                ¿No tienes cuenta?{' '}
                <button onClick={() => setIsSignUp(true)} className="text-[#FF2D2D] hover:underline">
                  Regístrate
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center"><div className="text-[#F8FAFC]">Cargando...</div></div>}>
      <LoginContent />
    </Suspense>
  )
}

