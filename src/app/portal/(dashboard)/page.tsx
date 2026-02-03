'use client'

import { useEffect, useState } from 'react'
import { Users, Dumbbell, MessageSquare, FileText, Activity } from 'lucide-react'

type OverviewData = {
  totalUsers: number
  totalTrainers: number
  trainersPublic: number
  trainersPrivate: number
  totalChats: number
  chatsLast7d: number
  activeWorkouts: number
  activeDiets: number
  pendingRequests: number
}

export default function PortalOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portal/overview', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.totalUsers !== undefined) setData(d)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-[#1A1D24] rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-[#1A1D24] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const cards = [
    { label: 'Total usuarios', value: data?.totalUsers ?? 0, icon: Users },
    { label: 'Total entrenadores', value: data?.totalTrainers ?? 0, icon: Dumbbell },
    { label: 'Entrenadores públicos', value: data?.trainersPublic ?? 0, sub: `/${data?.totalTrainers ?? 0}` },
    { label: 'Entrenadores privados', value: data?.trainersPrivate ?? 0 },
    { label: 'Chats total', value: data?.totalChats ?? 0, icon: MessageSquare },
    { label: 'Chats últimos 7d', value: data?.chatsLast7d ?? 0 },
    { label: 'Entrenamientos activos', value: data?.activeWorkouts ?? 0, icon: Activity },
    { label: 'Dietas activas', value: data?.activeDiets ?? 0, icon: FileText },
    { label: 'Solicitudes pendientes', value: data?.pendingRequests ?? 0, icon: FileText },
  ]

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-6">Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon
          return (
            <div
              key={i}
              className="rounded-xl bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-4"
            >
              {Icon && (
                <Icon className="w-5 h-5 text-[#FF2D2D] mb-2" />
              )}
              <p className="text-[#A7AFBE] text-sm">{c.label}</p>
              <p className="text-xl font-bold text-[#F8FAFC]">
                {c.value}
                {c.sub && <span className="text-[#7B8291] font-normal">{c.sub}</span>}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
