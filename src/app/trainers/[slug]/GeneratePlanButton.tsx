'use client'

import { useState } from 'react'

type Props = {
  slug: string
}

export function GeneratePlanButton({ slug }: Props) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleClick() {
    try {
      setLoading(true)
      setMessage(null)
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'basic',
          trainerSlug: slug,
          title: 'Plan 9 semanas',
          values: {}
        })
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('Generate plan failed:', response.status, errorText)
        setMessage(`Error: La petición falló (${response.status})`)
        return
      }

      const data = await response.json()
      if (data.ok) {
        const planIdText = data.planId ? ` (ID: ${data.planId})` : ' (no guardado en BD)'
        setMessage(`Plan generado${planIdText}`)
      } else {
        console.error('Generate plan returned error:', data.error)
        setMessage(`Error: ${data.error ?? 'desconocido'}`)
      }
    } catch (error: any) {
      console.error('Unexpected error in GeneratePlanButton:', error)
      setMessage(`Error inesperado: ${error?.message ?? error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-[1.25rem] bg-[#007AFF] px-5 py-3 text-white disabled:opacity-60"
      >
        {loading ? 'Generando…' : 'Generar plan (demo)'}
      </button>
      {message ? <div className="text-sm text-slate-600">{message}</div> : null}
    </div>
  )
}




