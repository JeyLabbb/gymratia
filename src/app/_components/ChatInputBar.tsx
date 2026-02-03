'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Mic, Paperclip, X } from 'lucide-react'

const MAX_RECORDING_SECONDS = 300
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_IMAGE_DIM = 1600
const IMAGE_QUALITY = 0.8
const MAX_IMAGES_PER_MESSAGE = 5

type AudioState = 'idle' | 'recording' | 'uploading' | 'transcribing' | 'preview'

type ChatInputBarProps = {
  placeholder: string
  value: string
  onChange: (v: string) => void
  onSend: (opts?: { imageUrls?: string[]; message?: string }) => void
  disabled?: boolean
  sending?: boolean
}

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let w = img.width
      let h = img.height
      if (w > MAX_IMAGE_DIM || h > MAX_IMAGE_DIM) {
        if (w > h) {
          h = Math.round((h * MAX_IMAGE_DIM) / w)
          w = MAX_IMAGE_DIM
        } else {
          w = Math.round((w * MAX_IMAGE_DIM) / h)
          h = MAX_IMAGE_DIM
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => resolve(blob || file),
        'image/jpeg',
        IMAGE_QUALITY
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Error loading image'))
    }
    img.src = url
  })
}

export function ChatInputBar({
  placeholder,
  value,
  onChange,
  onSend,
  disabled,
  sending,
}: ChatInputBarProps) {
  const [audioState, setAudioState] = useState<AudioState>('idle')
  const [recordingSec, setRecordingSec] = useState(0)
  const [transcriptionPreview, setTranscriptionPreview] = useState('')
  const [transcriptionError, setTranscriptionError] = useState('')
  const [attachedImages, setAttachedImages] = useState<Array<{ url: string; file: File }>>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const startRecording = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setTranscriptionError('')
    if (disabled || sending) return
    if (!navigator.mediaDevices?.getUserMedia) {
      setTranscriptionError('El micrófono no está disponible en este navegador. Usa HTTPS.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
      }
      mr.start(1000)
      setAudioState('recording')
      setRecordingSec(0)
      timerRef.current = setInterval(() => {
        setRecordingSec((s) => {
          if (s >= MAX_RECORDING_SECONDS - 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            stopRecording()
          }
          return s + 1
        })
      }, 1000)
    } catch (err: any) {
      console.error('Mic error:', err)
      setTranscriptionError(err?.message?.includes('Permission') || err?.name === 'NotAllowedError' ? 'Permiso de micrófono denegado' : 'Error al acceder al micrófono')
      setAudioState('idle')
    }
  }

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    setAudioState('idle')
  }

  const confirmRecording = async () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setAudioState('uploading')
    setTranscriptionError('')
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', blob)
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session) throw new Error('No session')
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al transcribir')
      const text = data.text?.trim() || ''
      if (!text) {
        setTranscriptionError('No se detectó voz. Reintenta.')
        setAudioState('idle')
        return
      }
      setTranscriptionPreview(text)
      setAudioState('preview')
    } catch (err: any) {
      setTranscriptionError(err?.message || 'Error al transcribir')
      setAudioState('idle')
    }
  }

  const sendTranscription = () => {
    if (transcriptionPreview.trim()) {
      onChange(transcriptionPreview)
      setTranscriptionPreview('')
      setAudioState('idle')
      setTimeout(() => onSend(), 0)
    }
  }

  const discardTranscription = () => {
    setTranscriptionPreview('')
    setTranscriptionError('')
    setAudioState('idle')
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    const toAdd = files.filter(f => f.type.startsWith('image/'))
    const tooBig = toAdd.filter(f => f.size > MAX_IMAGE_SIZE)
    if (tooBig.length > 0) {
      alert('Alguna imagen supera 5MB. Máx. 5MB por imagen.')
      return
    }
    const space = MAX_IMAGES_PER_MESSAGE - attachedImages.length
    if (space <= 0) return
    const adding = toAdd.slice(0, space)
    try {
      const newOnes: Array<{ url: string; file: File }> = []
      for (const file of adding) {
        const compressed = await compressImage(file)
        newOnes.push({
          url: URL.createObjectURL(compressed),
          file: new File([compressed], file.name, { type: 'image/jpeg' })
        })
      }
      setAttachedImages(prev => [...prev, ...newOnes])
    } catch {
      alert('Error al procesar las imágenes')
    }
  }

  const removeImage = (index: number) => {
    setAttachedImages(prev => {
      const next = [...prev]
      URL.revokeObjectURL(next[index].url)
      next.splice(index, 1)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending || disabled) return
    const text = value.trim()
    const hasImages = attachedImages.length > 0
    if (!text && !hasImages) return

    if (hasImages) {
      setUploadingImage(true)
      try {
        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
        if (!session) throw new Error('No session')
        const urls: string[] = []
        for (const { file } of attachedImages) {
          const fd = new FormData()
          fd.append('image', file)
          const res = await fetch('/api/upload-chat-image', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: fd,
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Error al subir')
          urls.push(data.imageUrl)
        }
        setAttachedImages([])
        onSend({ imageUrls: urls, message: text || '(imágenes adjuntas)' })
      } catch (err: any) {
        alert(err?.message || 'Error al subir las imágenes')
      } finally {
        setUploadingImage(false)
      }
    } else {
      onSend()
    }
  }

  const canSend = (value.trim() || attachedImages.length > 0) && !sending && !disabled

  if (audioState === 'recording') {
    return (
      <div className="rounded-[20px] bg-[#1A1D24] border border-[#FF2D2D]/40 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[#FF2D2D] font-medium">Grabando…</span>
          <span className="text-[#A7AFBE] text-sm">
            {Math.floor(recordingSec / 60)}:{(recordingSec % 60).toString().padStart(2, '0')}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={stopRecording}
            className="flex-1 py-2 rounded-[12px] bg-[#24282F] text-[#A7AFBE] text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmRecording}
            className="flex-1 py-2 rounded-[12px] bg-[#FF2D2D] text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            <span>Listo</span>
          </button>
        </div>
      </div>
    )
  }

  if (audioState === 'uploading' || audioState === 'transcribing') {
    return (
      <div className="rounded-[20px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] p-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#FF2D2D]" />
        <span className="text-[#A7AFBE]">Transcribiendo…</span>
      </div>
    )
  }

  if (audioState === 'preview') {
    return (
      <div className="rounded-[20px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] p-4 flex flex-col gap-3">
        <textarea
          value={transcriptionPreview}
          onChange={(e) => setTranscriptionPreview(e.target.value)}
          className="w-full rounded-[12px] bg-[#050509] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-[#F8FAFC] text-sm resize-none min-h-[60px] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
          placeholder="Edita la transcripción..."
          rows={3}
        />
        {transcriptionError && (
          <p className="text-red-400 text-sm">{transcriptionError}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={discardTranscription}
            className="flex-1 py-2 rounded-[12px] bg-[#24282F] text-[#A7AFBE] text-sm font-medium"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={sendTranscription}
            className="flex-1 py-2 rounded-[12px] bg-[#FF2D2D] text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Enviar
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      {transcriptionError && audioState === 'idle' && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm text-red-400 flex-1">{transcriptionError}</p>
          <button type="button" onClick={() => setTranscriptionError('')} className="text-xs text-[#7B8291] hover:text-[#F8FAFC]">
            Cerrar
          </button>
        </div>
      )}
      {attachedImages.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 p-2 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)]">
          {attachedImages.map((img, i) => (
            <div key={i} className="relative group">
              <img src={img.url} alt="Preview" className="w-14 h-14 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-1 -right-1 p-1 rounded-full bg-[#24282F] hover:bg-[#FF2D2D] text-[#A7AFBE] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={(e) => startRecording(e)}
          disabled={disabled || sending}
          className="relative z-10 p-3 rounded-full bg-[#1A1D24] text-[#A7AFBE] hover:text-[#FF2D2D] hover:bg-[#24282F] disabled:opacity-50 flex-shrink-0 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Grabar audio"
          aria-label="Grabar audio"
        >
          <Mic className="w-5 h-5" />
        </button>
        <label
          className={`p-2 rounded-full flex-shrink-0 cursor-pointer ${attachedImages.length >= MAX_IMAGES_PER_MESSAGE ? 'opacity-50 cursor-not-allowed' : 'bg-[#1A1D24] text-[#A7AFBE] hover:text-[#FF2D2D] hover:bg-[#24282F]'}`}
          title={attachedImages.length >= MAX_IMAGES_PER_MESSAGE ? `Máx. ${MAX_IMAGES_PER_MESSAGE} imágenes` : `Adjuntar imagen (${attachedImages.length}/${MAX_IMAGES_PER_MESSAGE})`}
        >
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
            onChange={handleImageSelect}
            className="hidden"
            multiple
            disabled={attachedImages.length >= MAX_IMAGES_PER_MESSAGE}
          />
          <Paperclip className="w-5 h-5" />
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e as any)
            }
          }}
          placeholder={placeholder}
          rows={1}
          disabled={disabled || sending}
          className="flex-1 rounded-[20px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 pr-12 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] resize-none max-h-32 overflow-y-auto"
        />
        <button
          type="submit"
          disabled={!canSend || uploadingImage}
          className="absolute right-1.5 sm:right-2 bottom-1.5 sm:bottom-2 p-1.5 sm:p-2 rounded-full bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] disabled:opacity-50 flex items-center justify-center flex-shrink-0"
        >
          {sending || uploadingImage ? (
            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
        </button>
      </div>
    </form>
  )
}
