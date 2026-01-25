'use client'

import { useEffect, useRef, useState } from 'react'

type ProgressEntry = {
  id: string
  date: string
  weight_kg: number
  notes?: string
}

type WeightProgressChartProps = {
  entries: ProgressEntry[]
}

export function WeightProgressChart({ entries }: WeightProgressChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; entry: ProgressEntry } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!canvasRef.current || entries.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Sort entries by date
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const width = canvas.width = canvas.offsetWidth
    const height = canvas.height = 300
    const padding = { top: 20, right: 20, bottom: 40, left: 50 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Find min and max values
    const weights = sortedEntries.map(e => e.weight_kg)
    const minWeight = Math.min(...weights) * 0.98
    const maxWeight = Math.max(...weights) * 1.02
    const weightRange = maxWeight - minWeight

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1
    const gridLines = 5
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (i / gridLines) * chartHeight
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, height - padding.bottom)
    ctx.lineTo(width - padding.right, height - padding.bottom)
    ctx.stroke()

    // Draw Y-axis labels (weight)
    ctx.fillStyle = '#A7AFBE'
    ctx.font = '11px Inter'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let i = 0; i <= gridLines; i++) {
      const value = maxWeight - (i / gridLines) * weightRange
      const y = padding.top + (i / gridLines) * chartHeight
      ctx.fillText(value.toFixed(1) + ' kg', padding.left - 10, y)
    }

    // Draw X-axis labels (dates)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const dateLabels = sortedEntries.length <= 7 
      ? sortedEntries 
      : sortedEntries.filter((_, i) => i % Math.ceil(sortedEntries.length / 7) === 0 || i === sortedEntries.length - 1)
    
    dateLabels.forEach((entry, idx) => {
      const originalIdx = sortedEntries.findIndex(e => e.id === entry.id)
      const x = padding.left + (originalIdx / (sortedEntries.length - 1 || 1)) * chartWidth
      const date = new Date(entry.date)
      const label = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      ctx.fillText(label, x, height - padding.bottom + 5)
    })

    // Draw line
    ctx.strokeStyle = '#FF2D2D'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    const points: Array<{ x: number; y: number; entry: ProgressEntry }> = []

    sortedEntries.forEach((entry, i) => {
      const x = padding.left + (i / (sortedEntries.length - 1 || 1)) * chartWidth
      const y = padding.top + chartHeight - ((entry.weight_kg - minWeight) / weightRange) * chartHeight
      
      points.push({ x, y, entry })

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw points
    points.forEach((point) => {
      ctx.fillStyle = '#FF2D2D'
      ctx.beginPath()
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2)
      ctx.fill()
      
      // White border
      ctx.strokeStyle = '#0A0A0B'
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // Handle mouse move for tooltip
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Find closest point
      let closestPoint: { x: number; y: number; entry: ProgressEntry } | null = null
      let minDistance = Infinity

      points.forEach((point) => {
        const distance = Math.sqrt(
          Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2)
        )
        if (distance < 20 && distance < minDistance) {
          minDistance = distance
          closestPoint = point
        }
      })

      if (closestPoint) {
        setHoveredPoint(closestPoint)
        setTooltipPosition({ x: e.clientX, y: e.clientY })
      } else {
        setHoveredPoint(null)
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove)

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
    }
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-[rgba(255,255,255,0.08)] rounded-[12px] bg-[#1A1D24]">
        <p className="text-[#A7AFBE] text-sm">No hay suficientes datos para mostrar la gráfica</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: '300px' }}
      />
      {hoveredPoint && (
        <div
          className="fixed z-50 bg-[#14161B] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 shadow-lg pointer-events-none"
          style={{
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: 'translateY(-100%)',
          }}
        >
          <p className="text-xs text-[#A7AFBE] mb-1">
            {new Date(hoveredPoint.entry.date).toLocaleDateString('es-ES', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
          <p className="text-sm font-bold text-[#FF2D2D]">
            {hoveredPoint.entry.weight_kg} kg
          </p>
          {hoveredPoint.entry.notes && (
            <p className="text-xs text-[#7B8291] mt-1 max-w-xs">
              {hoveredPoint.entry.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}





