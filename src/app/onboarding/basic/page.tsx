'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'

export default function OnboardingBasic() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({
    sex: 'male',
    height: '',
    weight: '',
    intensity: '5',
    days: '3',
    allergies: '',
    goal: '',
    fullName: '',
    preferredName: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/onboarding/basic')
    }
    
    // Cargar datos guardados de localStorage si existen
    const savedValues = localStorage.getItem('onboarding-basic-form')
    if (savedValues) {
      try {
        const parsed = JSON.parse(savedValues)
        setValues(parsed)
      } catch (e) {
        console.error('Error cargando datos guardados:', e)
      }
    }
  }, [user, authLoading, router])
  
  // Guardar formulario en localStorage cuando cambia
  useEffect(() => {
    if (values && Object.keys(values).length > 0) {
      localStorage.setItem('onboarding-basic-form', JSON.stringify(values))
    }
  }, [values])

  async function go() {
    if (!user) {
      router.push('/auth/login?redirect=/onboarding/basic')
      return
    }

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login?redirect=/onboarding/basic')
        return
      }

      // Save profile to Supabase
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: values.fullName || undefined,
          preferred_name: values.preferredName || undefined,
          height_cm: values.height ? Number(values.height) : undefined,
          weight_kg: values.weight ? Number(values.weight) : undefined,
          goal: values.goal || undefined,
          sex: values.sex || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Profile save error:', errorData)
        throw new Error(errorData.error || 'Failed to save profile')
      }

      // Limpiar datos guardados después de guardar exitosamente
      localStorage.removeItem('onboarding-basic-form')
      
      // Navigate to trainers selection after saving profile
      router.push('/trainers')
    } catch (error: any) {
      console.error('Error saving profile:', error)
      const errorMessage = error.message || 'Error al guardar los datos. Por favor, intenta de nuevo.'
      alert(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-[#F8FAFC]">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="font-heading text-3xl font-bold text-[#F8FAFC] mb-2">Comienza tu transformación</h1>
        <p className="text-[#A7AFBE] mb-6">Cuéntanos sobre ti para personalizar tu plan</p>
        <div className="mt-6 grid gap-4">
          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Nombre completo</label>
            <input
              type="text"
              className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
              placeholder="Ej: Juan Pérez García"
              value={values.fullName}
              onChange={e => setValues(v => ({ ...v, fullName: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Nombre preferido (cómo quieres que te llamen)</label>
            <input
              type="text"
              className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
              placeholder="Ej: Juan"
              value={values.preferredName}
              onChange={e => setValues(v => ({ ...v, preferredName: e.target.value }))}
            />
            <p className="text-xs text-[#7B8291] mt-1">Este es el nombre que usará tu entrenador para dirigirse a ti</p>
          </div>

          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Sexo</label>
            <select
              className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
              value={values.sex}
              onChange={e => setValues(v => ({ ...v, sex: e.target.value }))}
            >
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#A7AFBE] mb-2">Altura (cm)</label>
              <input
                type="number"
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                placeholder="Ej: 175"
                value={values.height}
                onChange={e => setValues(v => ({ ...v, height: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-[#A7AFBE] mb-2">Peso (kg)</label>
              <input
                type="number"
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                placeholder="Ej: 70"
                value={values.weight}
                onChange={e => setValues(v => ({ ...v, weight: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#A7AFBE] mb-2">Intensidad (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                placeholder="Ej: 7"
                value={values.intensity}
                onChange={e => setValues(v => ({ ...v, intensity: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-[#A7AFBE] mb-2">Días/semana</label>
              <input
                type="number"
                min="1"
                max="7"
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                placeholder="Ej: 4"
                value={values.days}
                onChange={e => setValues(v => ({ ...v, days: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Alergias (opcional)</label>
            <input
              className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
              placeholder="Ej: Frutos secos, mariscos..."
              value={values.allergies}
              onChange={e => setValues(v => ({ ...v, allergies: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">¿Cuál es tu objetivo?</label>
            <textarea
              rows={4}
              className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] resize-none"
              placeholder="Ej: Ganar músculo, perder grasa, mejorar fuerza..."
              value={values.goal}
              onChange={e => setValues(v => ({ ...v, goal: e.target.value }))}
            />
          </div>

          <button
            onClick={go}
            disabled={saving}
            className="rounded-[16px] bg-[#FF2D2D] text-[#F8FAFC] px-6 py-3 font-medium hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Continuar'}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-[#A7AFBE]">
          ¿Experto?{' '}
          <Link href="/onboarding/expert" className="text-[#FF2D2D] hover:underline">
            Ir al modo experto
          </Link>
        </div>
      </div>
    </div>
  )
}
