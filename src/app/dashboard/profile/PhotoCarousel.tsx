'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Gauge, Edit2 } from 'lucide-react'

type Photo = {
  id: string
  photo_url: string
  date: string
  photo_type?: string
  notes?: string
}

type PhotoCarouselProps = {
  photos: Photo[]
  onPhotoClick: (photo: Photo) => void
}

export function PhotoCarousel({ photos, onPhotoClick }: PhotoCarouselProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(2) // seconds per photo
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const speeds = [
    { label: 'Lento', value: 4 },
    { label: 'Normal', value: 2 },
    { label: 'Rápido', value: 1 },
    { label: 'Muy Rápido', value: 0.5 },
  ]

  useEffect(() => {
    if (isPlaying && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const scrollWidth = container.scrollWidth
      const clientWidth = container.clientWidth
      const maxScroll = scrollWidth - clientWidth

      if (maxScroll <= 0) {
        setIsPlaying(false)
        return
      }

      // Calculate how many photos fit in viewport
      const photoWidth = 192 + 16 // w-48 (192px) + gap (16px)
      const photosPerView = Math.floor(clientWidth / photoWidth)
      const totalPhotos = photos.length
      
      // Only auto-scroll if there are more photos than fit in viewport
      if (totalPhotos <= photosPerView) {
        setIsPlaying(false)
        return
      }

      // Calculate scroll step: move one photo width at a time
      const scrollStep = photoWidth
      // Calculate interval: speed determines how long to show each photo
      const interval = speed * 1000

      let currentScroll = container.scrollLeft

      intervalRef.current = setInterval(() => {
        currentScroll += scrollStep
        
        // If we've scrolled past the end, reset to start
        if (currentScroll >= maxScroll) {
          currentScroll = 0
          container.scrollTo({
            left: 0,
            behavior: 'auto', // Instant reset
          })
        } else {
          container.scrollTo({
            left: currentScroll,
            behavior: 'smooth',
          })
        }
      }, interval)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, speed, photos.length])

  const handleSpeedChange = () => {
    const currentIndex = speeds.findIndex(s => s.value === speed)
    const nextIndex = (currentIndex + 1) % speeds.length
    setSpeed(speeds[nextIndex].value)
  }

  const currentSpeedLabel = speeds.find(s => s.value === speed)?.label || 'Normal'

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] hover:bg-[#14161B] transition-colors text-sm"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Reproducir
              </>
            )}
          </button>
          <button
            onClick={handleSpeedChange}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] hover:bg-[#14161B] transition-colors text-sm"
            title={`Velocidad: ${currentSpeedLabel}`}
          >
            <Gauge className="w-4 h-4" />
            <span className="text-xs">{currentSpeedLabel}</span>
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative flex-shrink-0 w-48 h-48 rounded-[12px] overflow-hidden bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] group cursor-pointer"
            onClick={() => onPhotoClick(photo)}
          >
            <img
              src={photo.photo_url}
              alt={`Progreso ${new Date(photo.date).toLocaleDateString('es-ES')}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3">
              <div className="text-center text-white text-xs mb-2">
                <p className="font-medium">{new Date(photo.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                {photo.photo_type && (
                  <p className="text-[#FF2D2D] capitalize mt-1">{photo.photo_type === 'front' ? 'Frontal' : photo.photo_type === 'side' ? 'Lateral' : photo.photo_type === 'back' ? 'Espalda' : 'Otro'}</p>
                )}
                {photo.notes && (
                  <p className="text-white/80 text-[10px] mt-2 line-clamp-2">{photo.notes}</p>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onPhotoClick(photo)
                  }}
                  className="px-3 py-1.5 rounded-[8px] bg-[#FF2D2D] text-white text-xs hover:bg-[#FF3D3D] transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  Editar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

