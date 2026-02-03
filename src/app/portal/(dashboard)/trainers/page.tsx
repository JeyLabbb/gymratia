'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Trainer = {
  id: string
  slug: string
  trainer_name: string
  full_name: string | null
  email: string | null
  privacy_mode: string
  verification_status: string
  total_students: number
  active_students: number
  average_rating: number | null
  total_ratings: number | null
  created_at: string
}

const inputClass =
  'rounded-lg bg-[#14161B] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] px-3 py-2 text-sm'

export default function PortalTrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [minRating, setMinRating] = useState('')
  const [minStudents, setMinStudents] = useState('')
  const [privacy, setPrivacy] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (minRating) params.set('minRating', minRating)
    if (minStudents) params.set('minStudents', minStudents)
    if (privacy) params.set('privacy', privacy)
    params.set('sortBy', sortBy)
    params.set('sortOrder', sortOrder)
    setLoading(true)
    fetch(`/api/portal/trainers?${params}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setTrainers(d.trainers || []))
      .finally(() => setLoading(false))
  }, [q, minRating, minStudents, privacy, sortBy, sortOrder])

  const visibilityLabel = (p: string) => {
    if (p === 'public') return 'Público'
    if (p === 'private') return 'Privado'
    return p
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-6">Entrenadores</h1>

      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7B8291]" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o slug..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#14161B] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2">
            <span className="text-[#A7AFBE] text-sm whitespace-nowrap">Valoración mín.</span>
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className={inputClass}
            >
              <option value="">Cualquiera</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="4.5">4.5+</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-[#A7AFBE] text-sm whitespace-nowrap">Alumnos mín.</span>
            <select
              value={minStudents}
              onChange={(e) => setMinStudents(e.target.value)}
              className={inputClass}
            >
              <option value="">Cualquiera</option>
              <option value="1">1+</option>
              <option value="5">5+</option>
              <option value="10">10+</option>
              <option value="20">20+</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-[#A7AFBE] text-sm whitespace-nowrap">Visibilidad</span>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className={inputClass}
            >
              <option value="">Todos</option>
              <option value="public">Público</option>
              <option value="private">Privado</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-[#A7AFBE] text-sm whitespace-nowrap">Ordenar por</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={inputClass}
            >
              <option value="created_at">Fecha alta</option>
              <option value="average_rating">Valoración</option>
              <option value="active_students">Alumnos activos</option>
              <option value="trainer_name">Nombre</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className={inputClass}
            >
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#14161B] border-b border-[rgba(255,255,255,0.08)]">
                <th className="text-left px-4 py-3 text-[#A7AFBE] font-medium">Nombre</th>
                <th className="text-left px-4 py-3 text-[#A7AFBE] font-medium">Slug</th>
                <th className="text-left px-4 py-3 text-[#A7AFBE] font-medium">Email</th>
                <th className="text-left px-4 py-3 text-[#A7AFBE] font-medium">Visibilidad</th>
                <th className="text-left px-4 py-3 text-[#A7AFBE] font-medium">Alumnos</th>
                <th className="text-left px-4 py-3 text-[#A7AFBE] font-medium">Rating</th>
                <th className="text-left px-4 py-3 text-[#A7AFBE] font-medium">Alta</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#7B8291]">
                    Cargando...
                  </td>
                </tr>
              ) : trainers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#7B8291]">
                    No hay entrenadores
                  </td>
                </tr>
              ) : (
                trainers.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-[rgba(255,255,255,0.06)] hover:bg-[#1A1D24]/50"
                  >
                    <td className="px-4 py-3 text-[#F8FAFC]">{t.trainer_name}</td>
                    <td className="px-4 py-3 text-[#A7AFBE]">{t.slug}</td>
                    <td className="px-4 py-3 text-[#F8FAFC]">{t.email || '—'}</td>
                    <td className="px-4 py-3 text-[#A7AFBE]">{visibilityLabel(t.privacy_mode)}</td>
                    <td className="px-4 py-3 text-[#A7AFBE]">{t.active_students ?? t.total_students ?? 0}</td>
                    <td className="px-4 py-3 text-[#A7AFBE]">
                      {t.average_rating != null ? `${Number(t.average_rating).toFixed(1)} (${t.total_ratings ?? 0})` : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#A7AFBE]">
                      {format(new Date(t.created_at), 'd MMM yyyy', { locale: es })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
