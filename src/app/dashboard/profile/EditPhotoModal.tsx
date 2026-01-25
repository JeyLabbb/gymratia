'use client'

import { useState, useEffect } from 'react'
import { X, Save, Upload, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ProgressPhoto = {
  id: string
  photo_url: string
  date: string
  photo_type?: string
  notes?: string
}

type EditPhotoModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onDelete: () => void
  photo: ProgressPhoto | null
  userId: string
}

export function EditPhotoModal({ isOpen, onClose, onSuccess, onDelete, photo, userId }: EditPhotoModalProps) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    photo_type: 'front',
    notes: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [hasNewFile, setHasNewFile] = useState(false)

  useEffect(() => {
    if (photo) {
      setFormData({
        date: photo.date || new Date().toISOString().split('T')[0],
        photo_type: photo.photo_type || 'front',
        notes: photo.notes || ''
      })
      setPreview(photo.photo_url)
      setHasNewFile(false)
      setSelectedFile(null)
    }
  }, [photo])

  if (!isOpen || !photo) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setHasNewFile(true)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSaving(true)
    setUploading(hasNewFile && selectedFile !== null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      let photoUrl = photo.photo_url

      // If a new file was selected, upload it
      if (hasNewFile && selectedFile) {
        // Check if bucket exists
        const { data: buckets } = await supabase.storage.listBuckets()
        const progressPhotosBucket = buckets?.find(b => b.id === 'progress-photos')
        
        if (!progressPhotosBucket) {
          alert('Error: El bucket "progress-photos" no existe. Por favor, ejecuta el script create-progress-photos-bucket-only.sql en Supabase SQL Editor.')
          setSaving(false)
          setUploading(false)
          return
        }

        // Delete old file from storage
        if (photo.photo_url) {
          try {
            const urlParts = photo.photo_url.split('/progress-photos/')
            if (urlParts.length > 1) {
              const oldFilePath = urlParts[1]
              await supabase.storage.from('progress-photos').remove([oldFilePath]).catch(() => {})
            }
          } catch (err) {
            console.error('Error deleting old file:', err)
          }
        }

        // Upload new file
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${userId}-${Date.now()}.${fileExt}`
        const filePath = `${userId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('progress-photos')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('progress-photos')
          .getPublicUrl(filePath)

        photoUrl = publicUrl
      }

      // Update photo in database
      const response = await fetch('/api/progress-photos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: photo.id,
          date: formData.date,
          photo_type: formData.photo_type,
          notes: formData.notes || null
        }),
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'No se pudo actualizar la foto'}`)
      }
    } catch (error: any) {
      console.error('Error updating photo:', error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta foto? Esta acción no se puede deshacer.')) {
      return
    }

    setDeleting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/progress-photos?id=${photo.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        onDelete()
        onClose()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'No se pudo eliminar la foto'}`)
      }
    } catch (error: any) {
      console.error('Error deleting photo:', error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading text-xl font-bold text-[#F8FAFC]">Editar Foto de Progreso</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1A1D24] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#A7AFBE]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Foto</label>
            <div className="border-2 border-dashed border-[rgba(255,255,255,0.08)] rounded-[12px] p-6 text-center">
              {preview ? (
                <div className="space-y-4">
                  <img src={preview} alt="Preview" className="max-w-full max-h-64 mx-auto rounded-[12px]" />
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] hover:bg-[#14161B] transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    {hasNewFile ? 'Cambiar foto' : 'Reemplazar foto'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-12 h-12 text-[#A7AFBE] mx-auto mb-2" />
                  <p className="text-sm text-[#A7AFBE] mb-1">Haz clic para seleccionar una foto</p>
                  <p className="text-xs text-[#7B8291]">PNG, JPG hasta 10MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Fecha</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Tipo de foto</label>
            <select
              value={formData.photo_type}
              onChange={(e) => setFormData({ ...formData, photo_type: e.target.value })}
              className="w-full px-4 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
            >
              <option value="front">Frontal</option>
              <option value="side">Lateral</option>
              <option value="back">Espalda</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] resize-none"
              rows={4}
              placeholder="Notas adicionales... (Estas notas serán visibles para tu entrenador)"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || deleting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || deleting}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] bg-[#1A1D24] border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] hover:bg-[#14161B] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}





