'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'
import { MessageSquare, Loader2 } from 'lucide-react'

type RequestAccessButtonProps = {
  trainerSlug: string
  trainerName: string
  className?: string
}

export function RequestAccessButton({ trainerSlug, trainerName, className }: RequestAccessButtonProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [requested, setRequested] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRequest = async () => {
    if (!user) {
      // Redirigir a login si no está autenticado
      window.location.href = '/auth/login'
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('No hay sesión activa')
        setLoading(false)
        return
      }

      const response = await fetch('/api/trainer/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          trainerSlug,
          message: null, // Por ahora sin mensaje personalizado
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al enviar la solicitud')
        setLoading(false)
        return
      }

      setRequested(true)
    } catch (err: any) {
      console.error('Error solicitando acceso:', err)
      setError(err.message || 'Error al enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  if (requested) {
    return (
      <div className={`inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#22C55E]/20 border border-[#22C55E]/50 px-6 py-3 text-sm font-semibold text-[#22C55E] ${className}`}>
        <MessageSquare className="w-4 h-4" />
        Solicitud enviada
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleRequest}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#FF2D2D] px-6 py-3 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors shadow-[0_0_30px_rgba(255,45,45,0.3)] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <MessageSquare className="w-4 h-4" />
            Solicitar acceso a {trainerName}
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
}
