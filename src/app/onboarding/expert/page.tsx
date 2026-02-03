'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'onboarding-expert-form'

export default function OnboardingExpert() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({
    bodyfat: '',
    waist: '',
    chest: '',
    hip: '',
    notes: '',
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/onboarding/expert')
      return
    }
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setValues(parsed)
      } catch {
        // ignore
      }
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (values && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
    }
  }, [values])

  async function go() {
    if (!user) {
      router.push('/auth/login?redirect=/onboarding/expert')
      return
    }

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login?redirect=/onboarding/expert')
        return
      }

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      }

      // 1) Si hay datos del formulario básico en localStorage, guardar perfil primero
      const basicForm = localStorage.getItem('onboarding-basic-form')
      if (basicForm) {
        try {
          const basic = JSON.parse(basicForm)
          const profileRes = await fetch('/api/user/profile', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              full_name: basic.fullName || undefined,
              preferred_name: basic.preferredName || undefined,
              height_cm: basic.height ? Number(basic.height) : undefined,
              weight_kg: basic.weight ? Number(basic.weight) : undefined,
              goal: basic.goal || undefined,
              sex: basic.sex || undefined,
            }),
          })
          if (!profileRes.ok) {
            const err = await profileRes.json().catch(() => ({}))
            throw new Error(err.error || 'Error al guardar el perfil')
          }
          localStorage.removeItem('onboarding-basic-form')
        } catch (e) {
          console.error('Profile save error:', e)
          throw e
        }
      }

      // 2) Guardar medidas expertas en progress_tracking (hoy)
      const today = new Date().toISOString().split('T')[0]
      const measurements: Record<string, number> = {}
      if (values.waist.trim()) measurements.waist = Number(values.waist)
      if (values.chest.trim()) measurements.chest = Number(values.chest)
      if (values.hip.trim()) measurements.hip = Number(values.hip)

      const hasProgressData =
        (values.bodyfat.trim() && !Number.isNaN(Number(values.bodyfat))) ||
        Object.keys(measurements).length > 0 ||
        values.notes.trim()

      if (hasProgressData) {
        const progressRes = await fetch('/api/progress', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            date: today,
            body_fat_percentage: values.bodyfat.trim() ? Number(values.bodyfat) : undefined,
            measurements: Object.keys(measurements).length > 0 ? measurements : undefined,
            notes: values.notes.trim() || undefined,
          }),
        })
        if (!progressRes.ok) {
          const err = await progressRes.json().catch(() => ({}))
          throw new Error(err.error || 'Error al guardar las medidas')
        }
      }

      localStorage.removeItem(STORAGE_KEY)
      router.push('/trainers')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al guardar. Inténtalo de nuevo.'
      alert(message)
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
        <h1 className="font-heading text-3xl font-bold text-[#F8FAFC] mb-2">
          Modo experto
        </h1>
        <p className="text-[#A7AFBE] mb-6">
          Añade medidas opcionales para un ajuste más fino de tu plan (grasa corporal, cintura, pecho, cadera y notas).
        </p>

        <div className="mt-6 grid gap-4">
          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">
              % grasa corporal (opcional)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="Ej: 18.5"
              className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
              value={values.bodyfat}
              onChange={(e) => setValues((v) => ({ ...v, bodyfat: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-[#A7AFBE] mb-2">Cintura (cm)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Ej: 82"
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                value={values.waist}
                onChange={(e) => setValues((v) => ({ ...v, waist: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-[#A7AFBE] mb-2">Pecho (cm)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Ej: 100"
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                value={values.chest}
                onChange={(e) => setValues((v) => ({ ...v, chest: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-[#A7AFBE] mb-2">Cadera (cm)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Ej: 98"
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                value={values.hip}
                onChange={(e) => setValues((v) => ({ ...v, hip: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">
              Notas (opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Lesiones, sueño, preferencias de ejercicios…"
              className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] resize-none"
              value={values.notes}
              onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
            />
          </div>

          <button
            type="button"
            onClick={go}
            disabled={saving}
            className="rounded-[16px] bg-[#FF2D2D] text-[#F8FAFC] px-6 py-3 font-medium hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Continuar'}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-[#A7AFBE]">
          ¿Prefieres el modo básico?{' '}
          <Link href="/onboarding/basic" className="text-[#FF2D2D] hover:underline">
            Volver al modo básico
          </Link>
        </div>
      </div>
    </div>
  )
}
