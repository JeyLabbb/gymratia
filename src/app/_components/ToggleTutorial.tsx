'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from './AuthProvider'

export function ToggleTutorial() {
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (user) return
    if (typeof window === 'undefined') return

    const checkAndShow = () => {
      const hasSeen = localStorage.getItem('has_seen_toggle_tutorial')
      const hasMode = localStorage.getItem('preferred_mode') || localStorage.getItem('user_mode')
      const justSelected = sessionStorage.getItem('just_selected_mode') === 'true'

      if (!hasSeen && hasMode && justSelected) {
        sessionStorage.removeItem('just_selected_mode')
        setIsMobile(window.innerWidth < 768)
        setShow(true)
      }
    }

    checkAndShow()
    const interval = setInterval(checkAndShow, 300)
    window.addEventListener('modechange', checkAndShow)
    return () => {
      clearInterval(interval)
      window.removeEventListener('modechange', checkAndShow)
    }
  }, [user])

  const handleClose = () => {
    setShow(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('has_seen_toggle_tutorial', 'true')
    }
  }

  if (!show || user) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/90" onClick={handleClose} aria-hidden />
      <div
        className="relative w-full max-w-md bg-[#14161B] border-2 border-[#FF2D2D] rounded-[22px] p-6 shadow-[0_0_40px_rgba(255,45,45,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#1A1D24] transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5 text-[#A7AFBE]" />
        </button>
        <h3 className="font-heading text-xl font-bold text-[#F8FAFC] mb-3 pr-8">
          Cambia de modo cuando quieras
        </h3>
        <p className="text-[#A7AFBE] mb-5 leading-relaxed">
          Puedes alternar entre modo <strong className="text-[#FF2D2D]">Alumno</strong> y modo <strong className="text-[#FF2D2D]">Entrenador</strong> desde el menú del navbar.
          {isMobile && ' Abre el menú ☰ para cambiar de modo y explorar.'}
        </p>
        <button
          onClick={handleClose}
          className="w-full py-3 bg-[#FF2D2D] text-white rounded-xl font-semibold hover:bg-[#FF3D3D] transition-colors touch-manipulation"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

