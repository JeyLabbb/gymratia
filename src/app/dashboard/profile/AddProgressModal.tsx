'use client'

import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type AddProgressModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddProgressModal({ isOpen, onClose, onSuccess }: AddProgressModalProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight_kg: '',
    body_fat_percentage: '',
    notes: ''
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const selectedDate = new Date(formData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      selectedDate.setHours(0, 0, 0, 0)

      // Validate: no future dates
      if (selectedDate > today) {
        alert('No puedes registrar datos para fechas futuras')
        setSaving(false)
        return
      }

      const isToday = selectedDate.getTime() === today.getTime()
      const weightValue = formData.weight_kg ? parseFloat(formData.weight_kg) : null

      // Save progress
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          date: formData.date,
          weight_kg: weightValue,
          body_fat_percentage: formData.body_fat_percentage ? parseFloat(formData.body_fat_percentage) : null,
          notes: formData.notes || null
        }),
      })

      if (response.ok) {
        // If it's today's date and has weight, update profile
        if (isToday && weightValue !== null) {
          const profileResponse = await fetch('/api/user/profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              weight_kg: weightValue
            }),
          })

          if (!profileResponse.ok) {
            console.error('Error updating profile weight')
          }
        }

        onSuccess()
        setFormData({
          date: new Date().toISOString().split('T')[0],
          weight_kg: '',
          body_fat_percentage: '',
          notes: ''
        })
        onClose()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'No se pudo guardar el progreso'}`)
      }
    } catch (error: any) {
      console.error('Error saving progress:', error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading text-xl font-bold text-[#F8FAFC]">Añadir Registro de Progreso</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1A1D24] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#A7AFBE]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Fecha</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
              required
            />
            <p className="text-xs text-[#7B8291] mt-1">
              No se permiten fechas futuras. Si es hoy, el peso se actualizará en tu perfil.
            </p>
          </div>

          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Peso (kg)</label>
            <input
              type="number"
              step="0.1"
              value={formData.weight_kg}
              onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
              className="w-full px-4 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
              placeholder="75.5"
            />
          </div>

          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Grasa corporal (%)</label>
            <input
              type="number"
              step="0.1"
              value={formData.body_fat_percentage}
              onChange={(e) => setFormData({ ...formData, body_fat_percentage: e.target.value })}
              className="w-full px-4 py-3 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
              placeholder="15.0"
            />
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
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar'}
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

