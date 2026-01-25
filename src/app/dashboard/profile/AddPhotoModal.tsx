'use client'

import { useState, useEffect } from 'react'
import { X, Save, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type AddPhotoModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userId: string
}

export function AddPhotoModal({ isOpen, onClose, onSuccess, userId }: AddPhotoModalProps) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    photo_type: 'front',
    notes: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Cargar datos guardados de localStorage al abrir
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const savedData = localStorage.getItem('add-photo-modal-form')
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          setFormData(parsed)
        } catch (e) {
          console.error('Error parsing saved form data:', e)
        }
      }
    }
  }, [isOpen])

  // Guardar datos en localStorage cuando cambien
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      localStorage.setItem('add-photo-modal-form', JSON.stringify(formData))
    }
  }, [formData, isOpen])

  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      alert('Por favor, selecciona una foto')
      return
    }

    setSaving(true)
    setUploading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Check if bucket exists
      const { data: buckets } = await supabase.storage.listBuckets()
      const progressPhotosBucket = buckets?.find(b => b.id === 'progress-photos')
      
      if (!progressPhotosBucket) {
        // Try to create bucket automatically
        try {
          const setupResponse = await fetch('/api/storage/setup-bucket', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ bucketId: 'progress-photos' }),
          })

          const setupData = await setupResponse.json()

          if (!setupResponse.ok || setupData.manualSetupRequired) {
            // Show detailed error message with instructions
            const instructions = setupData.instructions
            let message = '❌ El bucket "progress-photos" no existe.\n\n'
            
            if (instructions?.sql) {
              message += '📋 Ejecuta este SQL en Supabase SQL Editor:\n\n'
              message += instructions.sql + '\n\n'
            }
            
            if (instructions?.steps) {
              message += '📝 Pasos:\n'
              instructions.steps.forEach((step: string) => {
                message += step + '\n'
              })
            } else {
              message += '📝 Pasos:\n'
              message += '1. Ve a https://supabase.com/dashboard\n'
              message += '2. Selecciona tu proyecto\n'
              message += '3. Haz clic en "SQL Editor"\n'
              message += '4. Copia y pega el contenido de create-progress-photos-bucket-only.sql\n'
              message += '5. Haz clic en "Run"\n'
            }

            alert(message)
            setSaving(false)
            setUploading(false)
            return
          }

          // Bucket created successfully, continue with upload
        } catch (setupError) {
          console.error('Error setting up bucket:', setupError)
          alert('Error: No se pudo crear el bucket automáticamente. Por favor, ejecuta el script create-progress-photos-bucket-only.sql en Supabase SQL Editor.')
          setSaving(false)
          setUploading(false)
          return
        }
      }

      // Upload to Supabase Storage
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

      // Save to database
      const response = await fetch('/api/progress-photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          photo_url: publicUrl,
          date: formData.date,
          photo_type: formData.photo_type,
          notes: formData.notes || null
        }),
      })

      if (response.ok) {
        onSuccess()
        setFormData({
          date: new Date().toISOString().split('T')[0],
          photo_type: 'front',
          notes: ''
        })
        setSelectedFile(null)
        setPreview(null)
        // Limpiar localStorage al guardar exitosamente
        if (typeof window !== 'undefined') {
          localStorage.removeItem('add-photo-modal-form')
        }
        onClose()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'No se pudo guardar la foto'}`)
      }
    } catch (error: any) {
      console.error('Error saving photo:', error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading text-xl font-bold text-[#F8FAFC]">Subir Foto de Progreso</h3>
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
                    Cambiar foto
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
                    required
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
              rows={3}
              placeholder="Notas adicionales..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !selectedFile}
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
                  Guardar
                </>
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


