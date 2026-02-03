'use client'

import { useEffect, useRef, useState } from 'react'

type Point = { date: string; count: number }
type PointWithCoords = { x: number; y: number; point: Point }

type UsersPerDayChartProps = {
  data: Point[]
  title?: string
  /** Si es true, el tooltip muestra "total acumulado"; si no, "usuarios" */
  cumulative?: boolean
}

export function UsersPerDayChart({ data, title = 'Usuarios por día', cumulative = true }: UsersPerDayChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hovered, setHovered] = useState<{ point: Point; x: number; y: number } | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = (canvas.width = canvas.offsetWidth)
    const height = 280
    canvas.height = height

    const padding = { top: 16, right: 16, bottom: 36, left: 44 }
    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom

    ctx.clearRect(0, 0, width, height)

    const counts = data.map((d) => d.count)
    const minY = 0
    const maxY = Math.max(Math.max(...counts, 1), 1)
    const rangeY = maxY - minY || 1

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartH
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, height - padding.bottom)
    ctx.lineTo(width - padding.right, height - padding.bottom)
    ctx.stroke()

    // Y labels
    ctx.fillStyle = '#A7AFBE'
    ctx.font = '11px Inter'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let i = 0; i <= 4; i++) {
      const val = Math.round(maxY - (i / 4) * rangeY)
      const y = padding.top + (i / 4) * chartH
      ctx.fillText(String(val), padding.left - 8, y)
    }

    // X labels (dates) – muestreo para no amontonar
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const step = data.length <= 8 ? 1 : Math.max(1, Math.floor(data.length / 7))
    data.forEach((d, i) => {
      if (i % step !== 0 && i !== data.length - 1) return
      const x = padding.left + (i / (data.length - 1 || 1)) * chartW
      const label = new Date(d.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      ctx.fillText(label, x, height - padding.bottom + 6)
    })

    const points: Array<{ x: number; y: number; point: Point }> = []
    data.forEach((d, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * chartW
      const y = padding.top + chartH - ((d.count - minY) / rangeY) * chartH
      points.push({ x, y, point: d })
    })

    // Area bajo la línea (gradiente)
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom)
    gradient.addColorStop(0, 'rgba(255, 45, 45, 0.25)')
    gradient.addColorStop(1, 'rgba(255, 45, 45, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(points[0].x, height - padding.bottom)
    points.forEach((p) => ctx.lineTo(p.x, p.y))
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom)
    ctx.closePath()
    ctx.fill()

    // Línea
    ctx.strokeStyle = '#FF2D2D'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.stroke()

    // Puntos
    points.forEach((p) => {
      ctx.fillStyle = '#FF2D2D'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#14161B'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      let closest: PointWithCoords | null = null
      let dist = 24
      points.forEach((p) => {
        const d = Math.hypot(mx - p.x, my - p.y)
        if (d < dist) {
          dist = d
          closest = p
        }
      })
      if (closest !== null) {
        const c = closest as PointWithCoords
        setHovered({ point: c.point, x: c.x, y: c.y })
        setTooltipPos({ x: e.clientX, y: e.clientY })
      } else {
        setHovered(null)
      }
    }

    canvas.addEventListener('mousemove', onMove)
    return () => canvas.removeEventListener('mousemove', onMove)
  }, [data])

  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-6 flex items-center justify-center h-[280px]">
        <p className="text-[#A7AFBE] text-sm">No hay datos para mostrar</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-4">
      <h3 className="font-heading text-lg font-bold text-[#F8FAFC] mb-4">{title}</h3>
      <div className="relative">
        <canvas ref={canvasRef} className="w-full" style={{ height: 280 }} />
        {hovered && (
          <div
            className="fixed z-50 bg-[#14161B] border border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2 shadow-xl pointer-events-none text-sm"
            style={{
              left: Math.min(tooltipPos.x + 12, window.innerWidth - 180),
              top: tooltipPos.y - 8,
              transform: 'translateY(-100%)',
            }}
          >
            <p className="text-[#A7AFBE] text-xs">
              {new Date(hovered.point.date).toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
            <p className="font-bold text-[#FF2D2D]">{hovered.point.count} {cumulative ? 'usuarios (total)' : 'usuarios'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
