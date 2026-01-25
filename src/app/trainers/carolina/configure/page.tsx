'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { personas } from '@/lib/personas'
import { TrainerSetupChat } from '../../edu/configure/TrainerSetupChat'

export default function CarolinaConfigurePage() {
  const router = useRouter()
  const { user } = useAuth()
  const carolina = personas.find((t) => t.slug === 'carolina')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!carolina || !carolina.setupIntro || !carolina.setupQuestions) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-[#F8FAFC]">No se ha podido cargar la configuración de Carolina.</div>
      </div>
    )
  }

  const handleComplete = async (answers: Record<string, string>) => {
    try {
      setStatus('idle')
      setErrorMessage(null)

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Sesión no encontrada')
      }

      // Save profile data from setup answers
      const profileResponse = await fetch('/api/user/save-setup-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName: answers.fullName,
          heightCm: answers.heightCm,
          weightKg: answers.weightKg,
          goal: answers.goal,
          sex: answers.sex,
          preferredName: answers.fullName?.split(' ')[0] // Use first name as preferred name
        }),
      })

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json().catch(() => ({}))
        throw new Error(errorData?.error ?? 'Error guardando el perfil')
      }

      const daysPerWeek = Number(answers.daysPerWeek ?? 0)
      const intensity = Number(answers.intensity ?? 0)
      const extraContext = answers.extraContext ?? ''

      const values = {
        fullName: answers.fullName ?? '',
        sex: answers.sex ?? '',
        heightCm: Number(answers.heightCm ?? 0),
        weightKg: Number(answers.weightKg ?? 0),
        goal: answers.goal ?? '',
        daysPerWeek: Number.isFinite(daysPerWeek) && daysPerWeek > 0 ? daysPerWeek : undefined,
        cannotTrainDays: answers.cannotTrainDays
          ? answers.cannotTrainDays
              .split(',')
              .map((d) => d.trim())
              .filter(Boolean)
          : [],
        intensity: Number.isFinite(intensity) && intensity > 0 ? intensity : undefined,
        extraContext: extraContext || undefined
      }

      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: 'basic',
          values,
          trainerSlug: 'carolina',
          title: 'Plan Carolina 9 semanas'
        })
      })

      if (!res.ok) {
        throw new Error('Error generating plan with Carolina')
      }

      const data = await res.json()

      if (!data.ok) {
        throw new Error(data.error ?? 'Unknown error generating plan')
      }

      setStatus('success')
      
      // Redirect to chat with trainer after plan generation
      setTimeout(() => {
        router.push('/dashboard/chat/carolina')
      }, 1500)
    } catch (err: any) {
      console.error(err)
      setStatus('error')
      setErrorMessage(err?.message ?? 'Error generating plan')
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <TrainerSetupChat
          trainerName={carolina.name}
          setupIntro={carolina.setupIntro}
          setupQuestions={carolina.setupQuestions}
          onComplete={handleComplete}
          enableFreeChat={true}
        />

        {status === 'success' && (
          <div className="mt-4 rounded-[1rem] bg-green-50 px-4 py-3 text-sm text-green-700">
            Plan generado con Carolina y guardado en tu cuenta. Redirigiendo al chat...
          </div>
        )}

        {status === 'error' && (
          <div className="mt-4 rounded-[1rem] bg-red-50 px-4 py-3 text-sm text-red-700">
            Ha habido un problema al generar el plan.
            {errorMessage ? ` Detalle: ${errorMessage}` : null}
          </div>
        )}
      </div>
    </div>
  )
}

