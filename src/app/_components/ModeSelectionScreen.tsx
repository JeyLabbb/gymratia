'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, GraduationCap, Info, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type ModeSelectionScreenProps = {
  onModeSelected: (mode: 'student' | 'trainer') => void
}

export function ModeSelectionScreen({ onModeSelected }: ModeSelectionScreenProps) {
  const [showInfo, setShowInfo] = useState(false)
  const router = useRouter()

  const handleSelectMode = (mode: 'student' | 'trainer') => {
    // Guardar preferredMode en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred_mode', mode)
      localStorage.setItem('user_mode', mode)
      // Marcar que se acaba de seleccionar un modo para activar el tutorial
      sessionStorage.setItem('just_selected_mode', 'true')
      // Disparar evento personalizado para que el navbar se actualice
      window.dispatchEvent(new Event('modechange'))
      // También disparar evento de storage para sincronización
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'user_mode',
        newValue: mode,
        storageArea: localStorage
      }))
    }
    onModeSelected(mode)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050509] via-[#050509] to-[#0A0A0B] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl md:text-5xl font-black text-[#F8FAFC] mb-4">
            Bienvenido a <span className="text-[#FF2D2D]">GymRatIA</span>
          </h1>
          <p className="text-lg text-[#A7AFBE] mb-2">
            ¿Cómo quieres usar la plataforma?
          </p>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="inline-flex items-center gap-2 text-sm text-[#7B8291] hover:text-[#A7AFBE] transition-colors"
          >
            <Info className="w-4 h-4" />
            ¿Cuál es la diferencia?
          </button>
        </div>

        {showInfo && (
          <div className="mb-8 p-6 bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px]">
            <p className="text-sm text-[#A7AFBE] mb-3">
              <strong className="text-[#F8FAFC]">Alumno:</strong> Entrena con planes personalizados, sigue tu progreso y chatea con entrenadores IA.
            </p>
            <p className="text-sm text-[#A7AFBE] mb-3">
              <strong className="text-[#F8FAFC]">Entrenador:</strong> Crea tu perfil, comparte contenido y conecta con alumnos.
            </p>
            <p className="text-xs text-[#7B8291]">
              Puedes cambiarlo cuando quieras desde el menú principal.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Opción Alumno */}
          <button
            onClick={() => handleSelectMode('student')}
            className="group relative overflow-hidden rounded-[28px] bg-[#14161B] border-2 border-[rgba(255,255,255,0.08)] hover:border-[#FF2D2D]/50 transition-all p-8 text-left hover:shadow-[0_0_40px_rgba(255,45,45,0.15)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF2D2D]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-[#FF2D2D]/20 flex items-center justify-center mb-6 group-hover:bg-[#FF2D2D]/30 transition-colors">
                <User className="w-8 h-8 text-[#FF2D2D]" />
              </div>
              <h2 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-3">
                Quiero entrenar
              </h2>
              <p className="text-[#A7AFBE] mb-4">
                Soy <strong className="text-[#F8FAFC]">alumno</strong> y quiero planes de entrenamiento personalizados, seguimiento de progreso y chat con entrenadores.
              </p>
              <div className="flex items-center gap-2 text-[#FF2D2D] group-hover:gap-3 transition-all">
                <span className="text-sm font-medium">Comenzar como alumno</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </button>

          {/* Opción Entrenador */}
          <button
            onClick={() => handleSelectMode('trainer')}
            className="group relative overflow-hidden rounded-[28px] bg-[#14161B] border-2 border-[rgba(255,255,255,0.08)] hover:border-[#FF2D2D]/50 transition-all p-8 text-left hover:shadow-[0_0_40px_rgba(255,45,45,0.15)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF2D2D]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-[#FF2D2D]/20 flex items-center justify-center mb-6 group-hover:bg-[#FF2D2D]/30 transition-colors">
                <GraduationCap className="w-8 h-8 text-[#FF2D2D]" />
              </div>
              <h2 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-3">
                Soy entrenador
              </h2>
              <p className="text-[#A7AFBE] mb-4">
                Soy <strong className="text-[#F8FAFC]">entrenador</strong> y quiero crear mi perfil, compartir contenido y conectar con alumnos.
              </p>
              <div className="flex items-center gap-2 text-[#FF2D2D] group-hover:gap-3 transition-all">
                <span className="text-sm font-medium">Comenzar como entrenador</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

