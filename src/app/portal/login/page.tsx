'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function PortalLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/portal'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Credenciales inválidas')
        return
      }
      router.push(from)
      router.refresh()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050509] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[20px] p-8">
          <h1 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-2">
            Portal Gymratia
          </h1>
          <p className="text-[#A7AFBE] text-sm mb-6">
            Acceso interno de administración
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#A7AFBE] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-[12px] bg-[#0A0A0B] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                placeholder="admin@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#A7AFBE] mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-[12px] bg-[#0A0A0B] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-[12px] bg-[#FF2D2D] text-white font-semibold hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050509] flex items-center justify-center">
        <div className="text-[#A7AFBE]">Cargando...</div>
      </div>
    }>
      <PortalLoginContent />
    </Suspense>
  )
}
