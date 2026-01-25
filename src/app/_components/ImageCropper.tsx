'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, Check } from 'lucide-react'
import type { Area, Point } from 'react-easy-crop'

interface ImageCropperProps {
  imageSrc: string
  onCrop: (croppedImageUrl: string) => void
  onCancel: () => void
  cropSize?: number
}

export function ImageCropper({
  imageSrc,
  onCrop,
  onCancel,
  cropSize = 400
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', (error) => reject(error))
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<string> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('No 2d context')
    }

    // Tamaño del canvas de salida
    canvas.width = cropSize
    canvas.height = cropSize

    // Dibujar la imagen recortada
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      cropSize,
      cropSize
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'))
          return
        }
        const url = URL.createObjectURL(blob)
        resolve(url)
      }, 'image/jpeg', 0.95)
    })
  }

  const handleCrop = async () => {
    if (!croppedAreaPixels) return

    try {
      const croppedImageUrl = await getCroppedImg(imageSrc, croppedAreaPixels)
      onCrop(croppedImageUrl)
    } catch (error) {
      console.error('Error al recortar la imagen:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 max-w-lg w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">
            Ajustar foto de perfil
          </h3>
          <button
            onClick={onCancel}
            className="text-[#A7AFBE] hover:text-[#F8FAFC] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#A7AFBE] mb-4">
          Arrastra para mover. Usa el slider para hacer zoom.
        </p>

        {/* Contenedor del cropper */}
        <div className="relative w-full aspect-square bg-[#0A0A0B] rounded-[16px] overflow-hidden border-2 border-[#FF2D2D] mb-4" style={{ maxWidth: '500px', maxHeight: '500px' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid={true}
            minZoom={0.5}
            maxZoom={3}
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
                position: 'relative',
                background: '#0A0A0B'
              },
              cropAreaStyle: {
                border: '2px solid #FF2D2D',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
              },
              mediaStyle: {
                objectFit: 'contain'
              }
            }}
          />
        </div>

        {/* Controles de zoom */}
        <div className="mb-4">
          <label className="block text-sm text-[#A7AFBE] mb-2">
            Zoom: {Math.round(zoom * 100)}%
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-2 bg-[#1A1D24] rounded-lg appearance-none cursor-pointer accent-[#FF2D2D]"
          />
        </div>

        {/* Botones */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-[12px] bg-transparent border border-[rgba(255,255,255,0.24)] text-[#F8FAFC] hover:border-[rgba(255,255,255,0.4)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCrop}
            className="px-4 py-2 rounded-[12px] bg-[#FF2D2D] text-white hover:bg-[#FF3D3D] transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}

