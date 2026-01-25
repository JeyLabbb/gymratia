'use client'

import { useEffect, useRef, useState } from 'react'
import { WeightProgressChart } from './WeightProgressChart'

type ProgressEntry = {
  id: string
  date: string
  weight_kg: number
  notes?: string
}

type WeightGraphViewProps = {
  entries: ProgressEntry[]
}

export function WeightGraphView({ entries }: WeightGraphViewProps) {
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

  return (
    <div 
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <WeightProgressChart entries={entries.filter(e => e.weight_kg)} />
    </div>
  )
}





