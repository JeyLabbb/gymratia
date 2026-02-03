'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Request = {
  id: string
  user_id: string
  trainer_id: string
  message: string | null
  status: string
  created_at: string
  trainer?: { slug: string; trainer_name: string; email: string | null }
}

export default function PortalRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portal/requests', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setRequests(d.requests || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-6">Solicitudes de acceso</h1>

      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#14161B] border-b border-[rgba(255,255,255,0.08)]">
                <th className="text-left px-4 py-3 text-[#A7AFBE] font-medium">Fecha</th>
                <th className="text-left px-4 py-3 text-[#A7AFBE] font-medium">Entrenador</th>
                <th className="text-left px-4 py-3 text-[#A7AFBE] font-medium">Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[#7B8291]">
                    Cargando...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[#7B8291]">
                    No hay solicitudes pendientes
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[rgba(255,255,255,0.06)] hover:bg-[#1A1D24]/50"
                  >
                    <td className="px-4 py-3 text-[#A7AFBE]">
                      {format(new Date(r.created_at), 'd MMM yyyy HH:mm', { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-[#F8FAFC]">
                      {r.trainer?.trainer_name || r.trainer?.slug || r.trainer_id}
                    </td>
                    <td className="px-4 py-3 text-[#A7AFBE] max-w-xs truncate">
                      {r.message || '—'}
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
