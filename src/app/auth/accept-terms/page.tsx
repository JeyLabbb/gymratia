'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'

const TERMS_VERSION = '2026-02-02'

export default function AcceptTermsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [accepted, setAccepted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/auth/accept-terms')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accepted) {
      setError('Debes aceptar los Términos y Condiciones para continuar.')
      return
    }
    if (!user) return
    setError('')
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login?redirect=/auth/accept-terms')
        return
      }
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          terms_accepted_at: new Date().toISOString(),
          terms_version: TERMS_VERSION,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al guardar')
      }
      // Redirigir al onboarding correspondiente según el modo (alumno o entrenador)
      const mode = typeof window !== 'undefined' ? (localStorage.getItem('user_mode') || 'student') : 'student'
      const { data: profile } = await supabase.from('user_profiles').select('id').eq('user_id', user.id).maybeSingle()
      const { data: trainer } = await supabase.from('trainers').select('id').eq('user_id', user.id).maybeSingle()

      if (mode === 'trainer') {
        if (trainer) {
          router.push('/trainers/dashboard')
        } else {
          router.push('/trainers/register?step=2')
        }
      } else {
        if (!profile) {
          router.push('/onboarding/basic')
        } else {
          router.push('/trainers')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-[#F8FAFC]">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-heading font-extrabold tracking-tight">
            GymRat<span className="text-[#FF2D2D]">IA</span>
          </Link>
        </div>
        <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-8">
          <h1 className="font-heading text-xl font-bold text-[#F8FAFC] mb-2">
            Acepta los Términos y Condiciones
          </h1>
          <p className="text-sm text-[#A7AFBE] mb-6">
            Para usar Gymratia debes leer y aceptar nuestros Términos y Condiciones.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 rounded border-[rgba(255,255,255,0.2)] bg-[#1A1D24] text-[#FF2D2D] focus:ring-[#FF2D2D]"
              />
              <span className="text-sm text-[#A7AFBE] group-hover:text-[#F8FAFC] transition-colors">
                He leído y acepto los{' '}
                <Link href="/terms" target="_blank" className="text-[#FF2D2D] hover:underline">
                  Términos y Condiciones
                </Link>
              </span>
            </label>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={saving || !accepted}
              className="w-full rounded-[16px] bg-[#FF2D2D] text-[#F8FAFC] px-6 py-3 font-medium hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Aceptar y continuar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
