'use client'

import { useEffect, useState, useRef } from 'react'
import { X } from 'lucide-react'
import { useAuth } from './AuthProvider'

export function ToggleTutorial() {
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const toggleRef = useRef<HTMLDivElement>(null)
  const [togglePosition, setTogglePosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null)

  useEffect(() => {
    // Solo mostrar si NO está logueado y se acaba de seleccionar un modo
    if (user) {
      return // No mostrar si está logueado
    }

    if (typeof window === 'undefined') return

    // Verificar si se acaba de seleccionar un modo (después de ModeSelectionScreen)
    const checkAndShowTutorial = () => {
      const hasSeenTutorial = localStorage.getItem('has_seen_toggle_tutorial')
      const hasSelectedMode = localStorage.getItem('preferred_mode') || localStorage.getItem('user_mode')
      const justSelectedMode = sessionStorage.getItem('just_selected_mode') === 'true'
      
      if (!hasSeenTutorial && hasSelectedMode && justSelectedMode) {
        // Limpiar el flag
        sessionStorage.removeItem('just_selected_mode')
        
        // Esperar a que el toggle esté renderizado
        const findToggle = () => {
          // Buscar el toggle en el navbar
          const toggle = document.querySelector('[data-toggle-mode]') as HTMLElement
          if (toggle) {
            const rect = toggle.getBoundingClientRect()
            setTogglePosition({
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width,
              height: rect.height
            })
            setShow(true)
          } else {
            // Reintentar después de un momento (máximo 20 intentos)
            let attempts = 0
            const maxAttempts = 20
            const interval = setInterval(() => {
              attempts++
              const toggle = document.querySelector('[data-toggle-mode]') as HTMLElement
              if (toggle) {
                const rect = toggle.getBoundingClientRect()
                setTogglePosition({
                  top: rect.top + window.scrollY,
                  left: rect.left + window.scrollX,
                  width: rect.width,
                  height: rect.height
                })
                setShow(true)
                clearInterval(interval)
              } else if (attempts >= maxAttempts) {
                clearInterval(interval)
              }
            }, 100)
          }
        }
        
        // Intentar inmediatamente y luego con un pequeño delay
        findToggle()
        setTimeout(findToggle, 500)
        setTimeout(findToggle, 1000)
        setTimeout(findToggle, 2000)
      }
    }

    // Verificar inmediatamente
    checkAndShowTutorial()

    // También escuchar cambios en sessionStorage
    const handleStorageChange = () => {
      checkAndShowTutorial()
    }

    // Escuchar evento personalizado de cambio de modo
    window.addEventListener('modechange', handleStorageChange)
    window.addEventListener('storage', handleStorageChange)
    
    // También verificar periódicamente (por si el evento no se dispara)
    const interval = setInterval(checkAndShowTutorial, 500)

    return () => {
      window.removeEventListener('modechange', handleStorageChange)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [user])

  const handleClose = () => {
    setShow(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('has_seen_toggle_tutorial', 'true')
    }
  }

  if (!show || !togglePosition || user) return null

  // Calcular posición del círculo (centrado sobre el toggle)
  const circleSize = Math.max(togglePosition.width, togglePosition.height) + 40
  const circleTop = togglePosition.top + togglePosition.height / 2 - circleSize / 2
  const circleLeft = togglePosition.left + togglePosition.width / 2 - circleSize / 2

  // Calcular posiciones para el agujero en el overlay
  const circleCenterX = togglePosition.left + togglePosition.width / 2
  const circleCenterY = togglePosition.top + togglePosition.height / 2
  const circleRadius = circleSize / 2

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay oscuro usando SVG con máscara (blanco = visible, negro = transparente) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <defs>
          <mask id={`tutorial-mask-${circleCenterX}-${circleCenterY}`}>
            {/* Todo blanco (cubierto) */}
            <rect width="100%" height="100%" fill="white" />
            {/* Círculo negro (agujero transparente) */}
            <circle 
              cx={circleCenterX} 
              cy={circleCenterY} 
              r={circleRadius + 5}
              fill="black"
            />
          </mask>
        </defs>
        <rect 
          width="100%" 
          height="100%" 
          fill="rgba(0, 0, 0, 0.9)" 
          mask={`url(#tutorial-mask-${circleCenterX}-${circleCenterY})`}
          className="backdrop-blur-sm"
        />
      </svg>
      
      {/* Overlay de respaldo sin blur para mejor contraste */}
      <div 
        className="absolute inset-0 bg-black/90"
        style={{
          maskImage: `radial-gradient(circle ${circleRadius + 5}px at ${circleCenterX}px ${circleCenterY}px, transparent ${circleRadius + 5}px, black ${circleRadius + 6}px)`,
          WebkitMaskImage: `radial-gradient(circle ${circleRadius + 5}px at ${circleCenterX}px ${circleCenterY}px, transparent ${circleRadius + 5}px, black ${circleRadius + 6}px)`,
        }}
      />
      
      {/* Círculo brillante sobre el toggle (sin sombra, brillo normal) */}
      <div
        className="absolute rounded-full border-4 border-[#FF2D2D] bg-transparent pointer-events-none"
        style={{
          top: `${circleTop}px`,
          left: `${circleLeft}px`,
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          boxShadow: '0 0 30px rgba(255, 45, 45, 0.6), 0 0 60px rgba(255, 45, 45, 0.4), 0 0 90px rgba(255, 45, 45, 0.2)',
          animation: 'pulse 2s ease-in-out infinite',
          zIndex: 10
        }}
      />
      
      {/* Mensaje debajo del toggle */}
      <div
        className="absolute bg-[#14161B] border-2 border-[#FF2D2D] rounded-[22px] p-6 shadow-[0_0_40px_rgba(255,45,45,0.4)] max-w-sm pointer-events-auto"
        style={{
          top: `${togglePosition.top + togglePosition.height + 150}px`,
          left: `${togglePosition.left + togglePosition.width / 2}px`,
          transform: 'translateX(-50%)'
        }}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-[#1A1D24] transition-colors"
        >
          <X className="w-4 h-4 text-[#A7AFBE]" />
        </button>
        <h3 className="font-heading text-lg font-bold text-[#F8FAFC] mb-2">
          Cambia de modo
        </h3>
        <p className="text-sm text-[#A7AFBE] mb-4">
          Puedes cambiar entre modo <strong className="text-[#FF2D2D]">Alumno</strong> y modo <strong className="text-[#FF2D2D]">Entrenador</strong> cuando quieras desde este toggle.
        </p>
        <button
          onClick={handleClose}
          className="w-full px-4 py-2 bg-[#FF2D2D] text-white rounded-lg font-semibold hover:bg-[#FF3D3D] transition-colors"
        >
          Entendido
        </button>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  )
}

