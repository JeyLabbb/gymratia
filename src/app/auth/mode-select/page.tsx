'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { User, Dumbbell, ArrowRight } from 'lucide-react'

export default function ModeSelectPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<'student' | 'trainer' | null>(null)

  const handleModeSelect = async (mode: 'student' | 'trainer') => {
    setSelectedMode(mode)
    
    // Guardar preferencia en localStorage
    localStorage.setItem('user_mode', mode)
    
    // Redirigir según el modo
    if (mode === 'student') {
      // Verificar si tiene perfil
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const profileRes = await fetch('/api/user/profile', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const profileData = await profileRes.json()
        
        if (profileData.profile) {
          router.push('/dashboard')
        } else {
          router.push('/onboarding/basic')
        }
      } else {
        router.push('/dashboard')
      }
    } else {
      // Modo entrenador - verificar si ya tiene perfil de entrenador
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: trainer } = await supabase
          .from('trainers')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle()
        
        if (trainer) {
          router.push('/trainers/dashboard')
        } else {
          router.push('/trainers/register?step=2')
        }
      } else {
        router.push('/trainers/register')
      }
    }
  }

  if (!user) {
    router.push('/auth/login')
    return null
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-heading font-extrabold tracking-tight">
            GymRat<span className="text-[#FF2D2D]">IA</span>
          </Link>
        </div>

        <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-8">
          <h2 className="font-heading text-2xl font-bold mb-4 text-center text-[#F8FAFC]">
            Elige tu modo
          </h2>
          <p className="text-center text-[#A7AFBE] mb-8">
            ¿Cómo quieres usar GymRatIA?
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Modo Alumno */}
            <button
              onClick={() => handleModeSelect('student')}
              className={`group relative bg-[#1A1D24] border-2 rounded-[22px] p-6 text-left transition-all hover:border-[#FF2D2D]/50 ${
                selectedMode === 'student'
                  ? 'border-[#FF2D2D] shadow-[0_0_40px_rgba(255,45,45,0.15)]'
                  : 'border-[rgba(255,255,255,0.08)]'
              }`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#FF2D2D] flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-xl font-bold text-[#F8FAFC] mb-2">
                    Modo Alumno
                  </h3>
                  <p className="text-sm text-[#A7AFBE] leading-relaxed">
                    Entrena con un entrenador IA personalizado. Accede a planes de entrenamiento, dietas y seguimiento de progreso.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-[#FF2D2D] group-hover:gap-3 transition-all">
                <span className="font-medium text-sm">Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            {/* Modo Entrenador */}
            <button
              onClick={() => handleModeSelect('trainer')}
              className={`group relative bg-[#1A1D24] border-2 rounded-[22px] p-6 text-left transition-all hover:border-[#FF2D2D]/50 ${
                selectedMode === 'trainer'
                  ? 'border-[#FF2D2D] shadow-[0_0_40px_rgba(255,45,45,0.15)]'
                  : 'border-[rgba(255,255,255,0.08)]'
              }`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#FF2D2D] flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-xl font-bold text-[#F8FAFC] mb-2">
                    Modo Entrenador
                  </h3>
                  <p className="text-sm text-[#A7AFBE] leading-relaxed">
                    Crea y gestiona tu contenido. Sube entrenamientos, dietas y conecta con tus alumnos.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-[#FF2D2D] group-hover:gap-3 transition-all">
                <span className="font-medium text-sm">Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-[#A7AFBE]">
            Puedes cambiar de modo en cualquier momento desde tu perfil.
          </div>
        </div>
      </div>
    </div>
  )
}

