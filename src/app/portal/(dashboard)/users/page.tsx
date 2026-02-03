'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type User = {
  id: string
  user_id: string
  full_name: string | null
  preferred_name: string | null
  email: string | null
  created_at: string
  trainer_slugs: string[]
  hasTrainer: boolean
}

export default function PortalUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [withTrainer, setWithTrainer] = useState<string>('')

  const fetchUsers = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (withTrainer) params.set('withTrainer', withTrainer)
    fetch(`/api/portal/users?${params}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
  }, [q, withTrainer])

  const name = (u: User) => u.preferred_name || u.full_name || u.email || '—'

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-6">Usuarios</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7B8291]" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por email o nombre..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#14161B] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
          />
        </div>
        <select
          value={withTrainer}
          onChange={(e) => setWithTrainer(e.target.value)}
          className="px-4 py-2 rounded-lg bg-[#14161B] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC]"
        >
          <option value="">Todos</option>
          <option value="true">Con entrenador</option>
          <option value="false">Sin entrenador</option>
        </select>
      </div>

      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#14161B] border-b border-[rgba(255,255,255,0.08)]">
                <th className="text-left px-4 py-3 text-[#A7AFBE] font-medium">Email</th>
                <th className="text-left px-4 py-3 text-[#A7AFBE] font-medium">Nombre</th>
                <th className="text-left px-4 py-3 text-[#A7AFBE] font-medium">Fecha alta</th>
                <th className="text-left px-4 py-3 text-[#A7AFBE] font-medium">Entrenador</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#7B8291]">
                    Cargando...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#7B8291]">
                    No hay usuarios
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-[rgba(255,255,255,0.06)] hover:bg-[#1A1D24]/50"
                  >
                    <td className="px-4 py-3 text-[#F8FAFC]">{u.email || '—'}</td>
                    <td className="px-4 py-3 text-[#F8FAFC]">{name(u)}</td>
                    <td className="px-4 py-3 text-[#A7AFBE]">
                      {format(new Date(u.created_at), 'd MMM yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-[#A7AFBE]">
                      {u.hasTrainer ? u.trainer_slugs.join(', ') : '—'}
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
