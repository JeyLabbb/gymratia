'use client'

import { useEffect, useRef, useState } from 'react'
import { Trophy } from 'lucide-react'
import { WeightProgressChart } from './WeightProgressChart'

type ProgressEntry = {
  id: string
  date: string
  weight_kg: number
  notes?: string
}

type WeightGraphViewProps = {
  entries: ProgressEntry[]
  targetWeightKg?: number
}

export function WeightGraphView({ entries, targetWeightKg }: WeightGraphViewProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation on mount
    setIsVisible(true)
  }, [])

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#A7AFBE]">
        <p>No hay suficientes datos para mostrar la gráfica</p>
      </div>
    )
  }

  const validEntries = entries.filter(e => e.weight_kg)
  const latestWeight = validEntries.length > 0
    ? validEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.weight_kg
    : null
  const hasReachedTarget = targetWeightKg != null && targetWeightKg > 0 && latestWeight != null &&
    Math.abs(latestWeight - targetWeightKg) <= 0.5

  return (
    <div 
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {hasReachedTarget && (
        <div className="mb-4 p-4 rounded-[16px] bg-gradient-to-r from-[#22C55E]/20 to-[#16A34A]/10 border-2 border-[#22C55E]/50 flex items-center gap-4">
          <div className="p-3 rounded-[12px] bg-[#22C55E]/30">
            <Trophy className="w-8 h-8 text-[#22C55E]" />
          </div>
          <div>
            <h4 className="font-heading text-lg font-bold text-[#F8FAFC]">
              ¡Objetivo alcanzado! 🎉
            </h4>
            <p className="text-sm text-[#A7AFBE]">
              Has llegado a tu peso objetivo de {targetWeightKg} kg. ¡Enhorabuena por tu constancia!
            </p>
          </div>
        </div>
      )}
      <WeightProgressChart entries={entries.filter(e => e.weight_kg)} targetWeightKg={targetWeightKg} />
    </div>
  )
}





