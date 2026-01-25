'use client'

import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type DataPoint = {
  date: string
  value: number
  label?: string
}

type ProgressGraphViewProps = {
  title: string
  data: DataPoint[]
  unit?: string
  color?: string
  goalValue?: number
}

export function ProgressGraphView({ 
  title, 
  data, 
  unit = '', 
  color = '#FF2D2D',
  goalValue 
}: ProgressGraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isAnimating, setIsAnimating] = useState(true)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width = canvas.offsetWidth
    const height = canvas.height = canvas.offsetHeight
    const padding = 40
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Find min and max values
    const values = data.map(d => d.value)
    const minValue = Math.min(...values, goalValue || Infinity) * 0.95
    const maxValue = Math.max(...values, goalValue || Infinity) * 1.05
    const valueRange = maxValue - minValue

    // Draw goal line if exists
    if (goalValue !== undefined) {
      const goalY = height - padding - ((goalValue - minValue) / valueRange) * chartHeight
      ctx.strokeStyle = '#A7AFBE'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(padding, goalY)
      ctx.lineTo(width - padding, goalY)
      ctx.stroke()
      ctx.setLineDash([])

      // Goal label
      ctx.fillStyle = '#A7AFBE'
      ctx.font = '12px Inter'
      ctx.fillText(`Objetivo: ${goalValue}${unit}`, width - padding - 100, goalY - 5)
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    // Animate line drawing
    const animate = () => {
      if (!isAnimating) return

      const startTime = Date.now()
      const duration = 1500 // 1.5 seconds

      const drawFrame = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const pointsToDraw = Math.ceil(data.length * progress)

        // Draw line
        if (pointsToDraw > 0) {
          ctx.strokeStyle = color
          ctx.lineWidth = 3
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()

          for (let i = 0; i < pointsToDraw; i++) {
            const point = data[i]
            const x = padding + (i / (data.length - 1 || 1)) * chartWidth
            const y = height - padding - ((point.value - minValue) / valueRange) * chartHeight

            if (i === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          }

          ctx.stroke()

          // Draw points
          for (let i = 0; i < pointsToDraw; i++) {
            const point = data[i]
            const x = padding + (i / (data.length - 1 || 1)) * chartWidth
            const y = height - padding - ((point.value - minValue) / valueRange) * chartHeight

            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(x, y, 4, 0, Math.PI * 2)
            ctx.fill()

            // Draw value label
            ctx.fillStyle = '#F8FAFC'
            ctx.font = '11px Inter'
            ctx.textAlign = 'center'
            ctx.fillText(`${point.value}${unit}`, x, y - 10)
          }
        }

        if (progress < 1) {
          requestAnimationFrame(drawFrame)
        } else {
          setIsAnimating(false)
        }
      }

      drawFrame()
    }

    animate()
  }, [data, color, goalValue, isAnimating, unit])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#A7AFBE]">
        <p>No hay datos para mostrar</p>
      </div>
    )
  }

  const latestValue = data[data.length - 1]?.value
  const previousValue = data.length > 1 ? data[data.length - 2]?.value : latestValue
  const trend = latestValue > previousValue ? 'up' : latestValue < previousValue ? 'down' : 'neutral'
  const change = latestValue - previousValue

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h4 className="font-heading text-xl font-bold text-[#F8FAFC]">{title}</h4>
        <div className="flex items-center gap-2">
          {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
          {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
          <span className={cn(
            "text-sm font-medium",
            trend === 'up' ? "text-green-500" : trend === 'down' ? "text-red-500" : "text-[#A7AFBE]"
          )}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}{unit}
          </span>
        </div>
      </div>

      <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4">
        <canvas
          ref={canvasRef}
          className="w-full h-64"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4">
          <p className="text-xs text-[#A7AFBE] mb-1">Valor Actual</p>
          <p className="text-2xl font-heading font-bold text-[#F8FAFC]">
            {latestValue}{unit}
          </p>
        </div>
        {data.length > 1 && (
          <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4">
            <p className="text-xs text-[#A7AFBE] mb-1">Cambio</p>
            <p className={cn(
              "text-2xl font-heading font-bold",
              change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-[#F8FAFC]"
            )}>
              {change > 0 ? '+' : ''}{change.toFixed(1)}{unit}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

