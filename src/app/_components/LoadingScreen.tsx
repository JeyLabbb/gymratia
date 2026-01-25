'use client'

import { useEffect, useState } from 'react'

type LoadingScreenProps = {
  message?: string
  fullScreen?: boolean
}

export function LoadingScreen({ message, fullScreen = true }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Simulate progress (0-90%, then wait for actual load)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) {
          return prev + Math.random() * 15
        }
        return prev
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  const containerClass = fullScreen
    ? 'min-h-screen bg-[#0A0A0B] flex items-center justify-center'
    : 'flex items-center justify-center py-12'

  return (
    <>
      <div className={containerClass}>
        <div className="flex flex-col items-center gap-6 max-w-sm mx-auto px-6">
          {/* Animated weightlifting GIF with GymRatIA colors */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <img
              src="/levantamiento-de-pesas-gymratia.gif"
              alt="Levantando pesas"
              className="w-12 h-12 object-contain"
              style={{
                imageRendering: 'auto',
                willChange: 'auto',
                transform: 'translateZ(0)',
              }}
              loading="eager"
              decoding="async"
            />
          </div>

          {/* Brand name */}
          <div className="text-center">
            <h2 className="font-heading text-4xl font-bold text-[#F8FAFC]">
              GymRat<span className="text-[#FF2D2D]">IA</span>
            </h2>
          </div>

          {/* Progress bar */}
          <div className="w-full">
            <div className="h-1.5 bg-[#1A1D24] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF2D2D] to-[#FF3D3D] rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                style={{ width: `${Math.min(progress, 100)}%` }}
              >
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  style={{
                    animation: 'shimmer 2s infinite',
                  }}
                />
              </div>
            </div>
            {message && (
              <div className="mt-2 text-center">
                <span className="text-xs text-[#A7AFBE]">
                  {message}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

    </>
  )
}
