'use client'

import { useState } from 'react'
import { X, AlertTriangle, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type SwitchTrainerModalProps = {
  isOpen: boolean
  onClose: () => void
  currentTrainer: { slug: string; name: string }
  newTrainer: { slug: string; name: string }
  onConfirm: () => void
}

export function SwitchTrainerModal({
  isOpen,
  onClose,
  currentTrainer,
  newTrainer,
  onConfirm
}: SwitchTrainerModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      // Pausar el entrenador actual (marcar como inactivo en la relación)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Aquí podrías actualizar el estado en trainer_student_relationships si existe
        // Por ahora solo redirigimos
      }
      
      onConfirm()
      router.push(`/dashboard/chat/${newTrainer.slug}`)
    } catch (error) {
      console.error('Error cambiando entrenador:', error)
    } finally {
      setLoading(false)
      onClose()
    }
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
          <div className="w-12 h-12 rounded-full bg-[#FFB020]/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-[#FFB020]" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading text-xl font-bold text-[#F8FAFC] mb-2">
              Cambiar de entrenador
            </h2>
            <p className="text-sm text-[#A7AFBE] leading-relaxed">
              Estás a punto de iniciar progreso con <span className="font-semibold text-[#F8FAFC]">{newTrainer.name}</span>.
            </p>
          </div>
        </div>

        <div className="rounded-[16px] bg-[#0A0A0B] border border-[rgba(255,255,255,0.08)] p-4 mb-6">
          <p className="text-sm text-[#A7AFBE] mb-2">
            <span className="font-semibold text-[#FFB020]">Tu progreso con {currentTrainer.name} se pausará</span> y se guardará para cuando vuelvas.
          </p>
          <p className="text-xs text-[#6B7280]">
            Tus datos de perfil, dietas y entrenamientos se mantendrán. Solo cambiará el entrenador activo.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-[16px] bg-transparent border border-[rgba(255,255,255,0.24)] px-4 py-3 text-sm font-medium text-[#F8FAFC] hover:border-[rgba(255,255,255,0.4)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#FF2D2D] px-4 py-3 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageSquare className="w-4 h-4" />
            {loading ? 'Cambiando...' : `Empezar con ${newTrainer.name}`}
          </button>
        </div>
      </div>
    </div>
  )
}

