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

type ProgressPhotosViewProps = {
  photos: Photo[]
  onPhotoClick?: (photo: Photo) => void
}

export function ProgressPhotosView({ photos, onPhotoClick }: ProgressPhotosViewProps) {
  const [isPlaying, setIsPlaying] = useState(false) // Don't start automatically
  const [speed, setSpeed] = useState(2) // seconds per photo
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const speeds = [
    { label: 'Lento', value: 4 },
    { label: 'Normal', value: 2 },
    { label: 'Rápido', value: 1 },
    { label: 'Muy Rápido', value: 0.5 },
  ]

  const minPhotosForCarousel = 5

  useEffect(() => {
    // Only allow carousel if we have minimum photos
    if (photos.length < minPhotosForCarousel) {
      setIsPlaying(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

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
      const photoWidth = 256 + 24 // w-64 (256px) + gap (24px)
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
      const originalContentWidth = totalPhotos * photoWidth
      // Start at the beginning of original photos (after duplicates at start)
      const startPosition = originalContentWidth

      // Initialize scroll position to start of original photos
      if (container.scrollLeft < originalContentWidth || container.scrollLeft >= originalContentWidth * 2) {
        container.scrollTo({
          left: startPosition,
          behavior: 'auto'
        })
      }

      let currentScroll = container.scrollLeft

      intervalRef.current = setInterval(() => {
        if (!container) return
        
        // Get current scroll position
        currentScroll = container.scrollLeft
        // Move forward
        currentScroll += scrollStep
        
        // If we've scrolled past the end of original photos (into end duplicates), 
        // reset to the equivalent position in the original content seamlessly
        if (currentScroll >= originalContentWidth * 2) {
          // Calculate how far we've scrolled into the end duplicates
          const excessScroll = currentScroll - (originalContentWidth * 2)
          // Reset to the equivalent position in the original content (after start duplicates)
          currentScroll = originalContentWidth + excessScroll
          // Use 'auto' behavior for instant, invisible reset
          container.scrollTo({
            left: currentScroll,
            behavior: 'auto',
          })
        } else {
          // Normal smooth scrolling within original content or end duplicates
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
        intervalRef.current = null
      }
    }
  }, [isPlaying, speed, photos.length])

  const handleSpeedChange = () => {
    const currentIndex = speeds.findIndex(s => s.value === speed)
    const nextIndex = (currentIndex + 1) % speeds.length
    setSpeed(speeds[nextIndex].value)
  }

  const currentSpeedLabel = speeds.find(s => s.value === speed)?.label || 'Normal'

  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#A7AFBE]">
        <p>No hay fotos de progreso disponibles</p>
      </div>
    )
  }

  const canPlay = photos.length >= minPhotosForCarousel

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Controls */}
      {photos.length >= minPhotosForCarousel && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (canPlay) {
                  setIsPlaying(!isPlaying)
                }
              }}
              disabled={!canPlay}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-sm transition-colors ${
                canPlay
                  ? 'bg-[#1A1D24] text-[#F8FAFC] hover:bg-[#14161B]'
                  : 'bg-[#0A0A0B] text-[#7B8291] cursor-not-allowed opacity-50'
              }`}
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
            {canPlay && (
              <button
                onClick={handleSpeedChange}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] hover:bg-[#14161B] transition-colors text-sm"
                title={`Velocidad: ${currentSpeedLabel}`}
              >
                <Gauge className="w-4 h-4" />
                <span className="text-xs">{currentSpeedLabel}</span>
              </button>
            )}
          </div>
          {!canPlay && (
            <p className="text-xs text-[#7B8291]">
              Necesitas al menos {minPhotosForCarousel} fotos para usar el carrusel automático
            </p>
          )}
        </div>
      )}

      {/* Carousel */}
      <div
        ref={scrollContainerRef}
        className={`flex gap-6 overflow-x-auto scrollbar-hide pb-2 ${
          photos.length <= 3 ? 'justify-center' : ''
        }`}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        onScroll={(e) => {
          // Handle infinite loop: when scrolling manually, seamlessly loop back
          if (scrollContainerRef.current && canPlay) {
            const container = scrollContainerRef.current
            const photoWidth = 256 + 24 // w-64 (256px) + gap (24px)
            const originalContentWidth = photos.length * photoWidth
            
            // If scrolled past original content (into duplicates), reset to equivalent position
            if (container.scrollLeft >= originalContentWidth) {
              const excessScroll = container.scrollLeft - originalContentWidth
              container.scrollTo({
                left: excessScroll,
                behavior: 'auto' // Instant reset for seamless loop
              })
            }
          }
        }}
      >
        {/* Duplicated photos at the start (for infinite scroll backwards) - only if carousel enabled */}
        {canPlay && photos.map((photo) => (
          <div
            key={`start-duplicate-${photo.id}`}
            className="relative flex-shrink-0 w-64 h-64 rounded-[12px] overflow-hidden bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] group cursor-pointer"
            onClick={() => onPhotoClick?.(photo)}
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
              {onPhotoClick && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onPhotoClick(photo)
                    }}
                    className="px-3 py-1.5 rounded-[8px] bg-[#FF2D2D] text-white text-xs hover:bg-[#FF3D3D] transition-colors flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Ver
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {/* Original photos */}
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative flex-shrink-0 w-64 h-64 rounded-[12px] overflow-hidden bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] group cursor-pointer"
            onClick={() => onPhotoClick?.(photo)}
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
              {onPhotoClick && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onPhotoClick(photo)
                    }}
                    className="px-3 py-1.5 rounded-[8px] bg-[#FF2D2D] text-white text-xs hover:bg-[#FF3D3D] transition-colors flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Ver
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {/* Duplicated photos for infinite loop (only show if carousel is enabled) */}
        {canPlay && photos.map((photo) => (
          <div
            key={`duplicate-${photo.id}`}
            className="relative flex-shrink-0 w-64 h-64 rounded-[12px] overflow-hidden bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] group cursor-pointer"
            onClick={() => onPhotoClick?.(photo)}
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
              {onPhotoClick && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onPhotoClick(photo)
                    }}
                    className="px-3 py-1.5 rounded-[8px] bg-[#FF2D2D] text-white text-xs hover:bg-[#FF3D3D] transition-colors flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Ver
                  </button>
                </div>
              )}
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

