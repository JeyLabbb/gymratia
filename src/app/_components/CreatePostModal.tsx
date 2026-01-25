"use client"

import { useState, useRef, useEffect } from 'react'
import { X, Image as ImageIcon, Video, Loader2, Trash2 } from 'lucide-react'
import SafeImage from './SafeImage'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'

type CreatePostModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState<'photo' | 'video' | 'text'>('photo')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cargar datos guardados de localStorage al abrir
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const savedData = localStorage.getItem('create-post-modal-form')
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          setContent(parsed.content || '')
          setPostType(parsed.postType || 'photo')
          setTags(parsed.tags || [])
        } catch (e) {
          console.error('Error parsing saved form data:', e)
        }
      }
    }
  }, [isOpen])

  // Guardar datos en localStorage cuando cambien (solo texto y tags, no archivos)
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      localStorage.setItem('create-post-modal-form', JSON.stringify({
        content,
        postType,
        tags
      }))
    }
  }, [content, postType, tags, isOpen])

  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    const videoFiles = files.filter(f => f.type.startsWith('video/'))

    if (videoFiles.length > 0) {
      setPostType('video')
      setMediaFiles(videoFiles.slice(0, 1))
      const url = URL.createObjectURL(videoFiles[0])
      setMediaUrls([url])
    } else if (imageFiles.length > 0) {
      setPostType('photo')
      const newFiles = [...mediaFiles, ...imageFiles].slice(0, 4)
      setMediaFiles(newFiles)
      
      const newUrls = newFiles.map(f => URL.createObjectURL(f))
      setMediaUrls(newUrls)
    }
  }

  const removeMedia = (index: number) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index)
    const newUrls = mediaUrls.filter((_, i) => i !== index)
    
    URL.revokeObjectURL(mediaUrls[index])
    
    setMediaFiles(newFiles)
    setMediaUrls(newUrls)
    
    if (newFiles.length === 0) {
      setPostType('text')
    }
  }

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (tag && tag.length > 0 && tag.length <= 50 && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleSubmit = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      return
    }

    if (!user) {
      return
    }

    setUploading(true)
    let session: any = null
    
    try {
      const sessionResult = await supabase.auth.getSession()
      session = sessionResult.data?.session

      if (!session) {
        console.error('No session found')
        setUploading(false)
        alert('No hay sesión activa. Por favor, inicia sesión de nuevo.')
        return
      }

      let uploadedUrls: string[] = []
      if (mediaFiles.length > 0) {
        uploadedUrls = await Promise.all(
          mediaFiles.map((file, index) => {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}-${index}.${fileExt}`
            const filePath = `${session.user.id}/${fileName}`
            
            return supabase.storage
              .from('posts')
              .upload(filePath, file, { cacheControl: '3600', upsert: false })
              .then(() => {
                const { data: { publicUrl } } = supabase.storage
                  .from('posts')
                  .getPublicUrl(filePath)
                return publicUrl
              })
          })
        )
      }

      const response = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          content: content.trim() || null,
          post_type: postType === 'text' ? 'text' : postType === 'video' ? 'video' : 'photo',
          media_urls: uploadedUrls || [],
          tags: tags || []
        })
      })

      if (!response.ok) {
        let errorMessage = 'Error al crear el post'
        try {
          const errorData = await response.json()
          errorMessage = errorData?.error || errorMessage
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      mediaUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
      
      setContent('')
      setMediaFiles([])
      setMediaUrls([])
      setTags([])
      setPostType('photo')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error creating post:', error)
      alert(error.message || 'Error al crear el post')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    mediaUrls.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url)
      }
    })
    setContent('')
    setMediaFiles([])
    setMediaUrls([])
    setTags([])
    setPostType('photo')
    // No limpiar localStorage al cerrar, mantener datos para la próxima vez
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0A0A0B] border border-[rgba(255,255,255,0.08)] rounded-[20px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.08)]">
          <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">
            Crear publicación
          </h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-[#1A1D24] transition-colors"
          >
            <X className="w-5 h-5 text-[#A7AFBE]" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Media Preview - Estilo Instagram/TikTok mejorado */}
          {mediaUrls.length > 0 ? (
            <div className="relative bg-[#0A0A0B] border-b border-[rgba(255,255,255,0.08)]">
              {postType === 'video' ? (
                <div className="relative">
                  <video src={mediaUrls[0]} controls className="w-full max-h-[400px] object-contain bg-[#0A0A0B]" />
                  <button
                    onClick={() => removeMedia(0)}
                    className="absolute top-4 right-4 p-2 bg-black/70 rounded-full hover:bg-black/90 transition-colors backdrop-blur-sm"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className={`grid gap-2 p-4 ${mediaUrls.length === 1 ? 'grid-cols-1' : mediaUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                  {mediaUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-[#1A1D24]">
                        <SafeImage
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-contain"
                        />
                        <button
                          onClick={() => removeMedia(index)}
                          className="absolute top-2 right-2 p-2 bg-black/70 rounded-full hover:bg-black/90 transition-colors opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 bg-[#0A0A0B] border-b border-[rgba(255,255,255,0.08)]">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-3 px-8 py-6 border-2 border-dashed border-[rgba(255,255,255,0.12)] rounded-xl hover:border-[#FF2D2D] transition-colors group"
              >
                {postType === 'video' ? (
                  <Video className="w-10 h-10 text-[#A7AFBE] group-hover:text-[#FF2D2D] transition-colors" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-[#A7AFBE] group-hover:text-[#FF2D2D] transition-colors" />
                )}
                <span className="text-[#A7AFBE] text-sm font-medium group-hover:text-[#FF2D2D] transition-colors">
                  {postType === 'video' ? 'Subir video' : 'Subir fotos'}
                </span>
              </button>
            </div>
          )}

          {/* Text Content */}
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#A7AFBE] mb-2">
                Descripción
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe un pie de foto..."
                className="w-full min-h-[120px] px-4 py-3 bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#F8FAFC] placeholder-[#7B8291] resize-none focus:outline-none focus:border-[#FF2D2D] transition-colors text-sm leading-relaxed"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-[#A7AFBE] mb-2">
                Etiquetas
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 bg-[#1A1D24] border border-[#FF2D2D]/30 text-[#FF2D2D] text-sm rounded-lg flex items-center gap-2"
                  >
                    #{tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-[#FF3D3D] transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Añadir etiqueta..."
                  className="flex-1 px-4 py-2.5 bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#F8FAFC] text-sm placeholder-[#7B8291] focus:outline-none focus:border-[#FF2D2D] transition-colors"
                />
                {tagInput.trim() && (
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2.5 bg-[#FF2D2D] text-white rounded-lg text-sm font-medium hover:bg-[#FF3D3D] transition-colors"
                  >
                    Añadir
                  </button>
                )}
              </div>
            </div>

            {/* Media Actions */}
            <div>
              <label className="block text-sm font-medium text-[#A7AFBE] mb-2">
                Media
              </label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#A7AFBE] hover:bg-[#252932] hover:text-[#F8FAFC] transition-colors"
              >
                {postType === 'video' ? (
                  <Video className="w-5 h-5" />
                ) : (
                  <ImageIcon className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">
                  {mediaFiles.length > 0 
                    ? postType === 'video' ? 'Cambiar video' : `Cambiar fotos (${mediaFiles.length})`
                    : postType === 'video' ? 'Añadir video' : 'Añadir fotos'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.08)] bg-[#0A0A0B]">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#A7AFBE] hover:bg-[#252932] transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading || (!content.trim() && mediaFiles.length === 0)}
              className="px-6 py-2.5 bg-[#FF2D2D] text-white rounded-lg font-semibold hover:bg-[#FF3D3D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                'Publicar'
              )}
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={postType === 'video' ? 'video/*' : 'image/*'}
          multiple={postType === 'photo'}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  )
}

