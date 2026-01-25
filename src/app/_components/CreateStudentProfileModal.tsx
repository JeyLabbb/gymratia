'use client'

import { useState } from 'react'
import { X, UserPlus, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

type CreateStudentProfileModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function CreateStudentProfileModal({
  isOpen,
  onClose
}: CreateStudentProfileModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const handleCreateProfile = () => {
    router.push('/onboarding/basic')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-[24px] bg-[#14161B] border border-[rgba(255,255,255,0.12)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#1A1D24] transition-colors text-[#A7AFBE] hover:text-[#F8FAFC]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-6 h-6 text-[#FF2D2D]" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading text-xl font-bold text-[#F8FAFC] mb-2">
              Inicia o crea tu perfil de alumno
            </h2>
            <p className="text-sm text-[#A7AFBE] leading-relaxed">
              Para poder hablar con los entrenadores, necesitas tener un perfil de alumno activo.
            </p>
          </div>
        </div>

        <div className="rounded-[16px] bg-[#0A0A0B] border border-[rgba(255,255,255,0.08)] p-4 mb-6">
          <p className="text-sm text-[#A7AFBE]">
            Con tu perfil de alumno podrás:
          </p>
          <ul className="text-xs text-[#6B7280] mt-2 space-y-1 list-disc list-inside">
            <li>Chatear con entrenadores</li>
            <li>Recibir planes personalizados</li>
            <li>Hacer seguimiento de tu progreso</li>
            <li>Gestionar tus dietas y entrenamientos</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-[16px] bg-transparent border border-[rgba(255,255,255,0.24)] px-4 py-3 text-sm font-medium text-[#F8FAFC] hover:border-[rgba(255,255,255,0.4)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateProfile}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#FF2D2D] px-4 py-3 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors"
          >
            Crear perfil de alumno
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
