'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'

type Props = {
  slug: string
}

export function GeneratePlanButton({ slug }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    try {
      setLoading(true)
      setError(null)
      
      // Llamar a build-excel que genera y descarga el archivo
      const response = await fetch('/api/build-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerSlug: slug,
          profile: {
            fullName: 'Usuario',
            sex: 'hombre',
            height_cm: 175,
            weight_kg: 75,
            goal: 'ganar músculo'
          },
          availability: {
            daysPerWeek: 4,
            cannotTrain: []
          },
          intensity: 8
        })
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Error desconocido')
        setError('No se pudo generar el plan. Intenta más tarde.')
        console.error('Build excel failed:', response.status, errorText)
        return
      }

      // Descargar el archivo
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `plan_${slug}_9_semanas.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Error generating plan:', err)
      setError('Error al generar el plan. Intenta más tarde.')
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
        className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-transparent border border-[rgba(255,255,255,0.24)] px-4 py-2.5 text-xs md:text-sm font-medium text-[#F9FAFB] hover:border-[#FF2D2D]/70 hover:text-[#FFE4E6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-[#FF2D2D] border-t-transparent rounded-full animate-spin" />
            Generando...
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-4 h-4" />
            Descargar plan en Excel
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-[#EF4444] mt-1">{error}</p>
      )}
    </div>
  )
}




