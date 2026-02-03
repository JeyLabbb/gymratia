'use client'

import { useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { useAuth } from './AuthProvider'

const PADDING = 8
const GAP = 16

function useToggleRect() {
  const [rect, setRect] = useState<DOMRect | null>(null)

  const update = useCallback(() => {
    if (typeof document === 'undefined') return
    const el = document.querySelector('[data-toggle-mode]')
    if (!el) {
      setRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) {
      setRect(null)
      return
    }
    setRect(r)
  }, [])

  useEffect(() => {
    update()
    const interval = setInterval(update, 100)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [update])

  return rect
}

export function ToggleTutorial() {
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const toggleRect = useToggleRect()

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

  const hasToggle = toggleRect && (isMobile === false)

  if (hasToggle && toggleRect) {
    return (
      <div className="fixed inset-0 z-[100]" aria-modal="true" role="dialog" aria-label="Tutorial del selector de modo">
        <div
          className="absolute inset-0 bg-black/70"
          onClick={handleClose}
          aria-hidden
        />
        <div
          className="absolute rounded-2xl border-2 border-[#FF2D2D] shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] pointer-events-none box-content"
          style={{
            top: toggleRect.top - PADDING,
            left: toggleRect.left - PADDING,
            width: toggleRect.width + PADDING * 2,
            height: toggleRect.height + PADDING * 2,
          }}
        />
        {(() => {
          const msgHeight = 220
          const winH = typeof window !== 'undefined' ? window.innerHeight : 700
          const spaceBelow = winH - (toggleRect.bottom + PADDING + GAP)
          const showBelow = spaceBelow >= msgHeight
          const messageTop = showBelow
            ? toggleRect.bottom + PADDING + GAP
            : toggleRect.top - msgHeight - GAP
          return (
            <div
              className="absolute left-1/2 -translate-x-1/2 w-full max-w-md px-4"
              style={{
                top: messageTop,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-[#14161B] border-2 border-[#FF2D2D] rounded-[22px] p-5 shadow-[0_0_40px_rgba(255,45,45,0.3)]">
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[#1A1D24] transition-colors touch-manipulation"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-[#A7AFBE]" />
            </button>
            <h3 className="font-heading text-lg font-bold text-[#F8FAFC] mb-2 pr-8">
              Cambia de modo cuando quieras
            </h3>
            <p className="text-[#A7AFBE] text-sm mb-4 leading-relaxed">
              Puedes alternar entre modo <strong className="text-[#FF2D2D]">Alumno</strong> y modo <strong className="text-[#FF2D2D]">Entrenador</strong> desde este selector en el navbar.
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
        })()}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center p-4 sm:p-6" aria-modal="true" role="dialog" aria-label="Tutorial del selector de modo">
      <div className="absolute inset-0 bg-black/90" onClick={handleClose} aria-hidden />
      <div
        className="relative w-full max-w-md bg-[#14161B] border-2 border-[#FF2D2D] rounded-[22px] p-6 shadow-[0_0_40px_rgba(255,45,45,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#1A1D24] transition-colors touch-manipulation"
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
