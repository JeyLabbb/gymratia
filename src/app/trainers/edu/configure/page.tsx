'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { personas } from '@/lib/personas'
import { TrainerSetupChat } from './TrainerSetupChat'

export default function ConfigureEduPage() {
  const router = useRouter()
  const { user } = useAuth()
  const edu = personas.find((t) => t.slug === 'edu')

  const handleComplete = async (answers: Record<string, string>) => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

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

      // Generate plan (existing logic)
      const body = {
        trainerSlug: 'edu',
        profile: {
          fullName: answers.fullName ?? '',
          sex: answers.sex ?? '',
          height_cm: Number(answers.heightCm ?? 0),
          weight_kg: Number(answers.weightKg ?? 0),
          goal: answers.goal ?? ''
        },
        availability: {
          daysPerWeek: Number(answers.daysPerWeek ?? 0),
          cannotTrain: answers.cannotTrainDays
            ? answers.cannotTrainDays
                .split(',')
                .map((d) => d.trim())
                .filter(Boolean)
            : []
        },
        intensity: Number(answers.intensity ?? 0)
      }

      const res = await fetch('/api/build-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData?.error ?? 'Error generando el plan')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plan_edu_9_semanas.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      
      // Redirect to chat with trainer after plan generation
      setTimeout(() => {
        router.push('/dashboard/chat/edu')
      }, 1000)
    } catch (error: any) {
      console.error('Error in setup:', error)
      alert(`Error: ${error.message || 'Error desconocido'}`)
    }
  }

  if (!edu || !edu.setupIntro || !edu.setupQuestions) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-[#F8FAFC]">Configuración no disponible</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <TrainerSetupChat
          trainerName={edu.name}
          setupIntro={edu.setupIntro}
          setupQuestions={edu.setupQuestions}
          onComplete={handleComplete}
          enableFreeChat={true}
        />
      </div>
    </div>
  )
}


