'use client'

import { useEffect, useState } from 'react'
import { X, MessageCircle } from 'lucide-react'
import { personas } from '@/lib/personas'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type TrainerNotificationPopupProps = {
  trainerSlug: 'edu' | 'carolina'
  message: string
  onClose: () => void
  onOpen: () => void
}

export function TrainerNotificationPopup({
  trainerSlug,
  message,
  onClose,
  onOpen,
}: TrainerNotificationPopupProps) {
  const router = useRouter()
  const trainer = personas.find((p) => p.slug === trainerSlug)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10)

    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose(), 300) // Wait for animation
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  const handleClick = () => {
    onOpen()
    router.push(`/dashboard/chat/${trainerSlug}`)
    onClose()
  }

  if (!trainer) return null

  const preview = message.length > 80 ? message.substring(0, 80) + '...' : message

  return (
    <div
      className={cn(
        'fixed top-4 left-4 z-50 transition-all duration-300',
        isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      )}
    >
      <div
        onClick={handleClick}
        className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 shadow-lg max-w-sm cursor-pointer hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)] group"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-lg flex-shrink-0 group-hover:scale-110 transition-transform">
            {trainer.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4 text-[#FF2D2D] flex-shrink-0" />
              <p className="font-heading text-sm font-bold text-[#F8FAFC]">
                Mensaje de {trainer.name}
              </p>
            </div>
            <p className="text-sm text-[#A7AFBE] line-clamp-2 leading-relaxed">
              {preview}
            </p>
            <p className="text-xs text-[#7B8291] mt-2">Haz clic para abrir</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsVisible(false)
              setTimeout(() => onClose(), 300)
            }}
            className="p-1 rounded-lg hover:bg-[#1A1D24] transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-[#A7AFBE]" />
          </button>
        </div>
      </div>
    </div>
  )
}


