'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function ReviewTrainerPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<'success' | 'error' | null>(null)
  const [message, setMessage] = useState('')

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!token) {
      setResult('error')
      setMessage('Token no válido')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/review-trainer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, action })
      })

      const data = await response.json()

      if (response.ok) {
        setResult('success')
        setMessage(data.message || 'Revisión procesada correctamente')
      } else {
        setResult('error')
        setMessage(data.error || 'Error al procesar la revisión')
      }
    } catch (error: any) {
      setResult('error')
      setMessage('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#F8FAFC] mb-2">Token inválido</h1>
          <p className="text-[#A7AFBE]">El link de revisión no es válido o ha expirado.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050509] via-[#050509] to-[#0A0A0B] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {result === null && (
          <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[28px] p-8 text-center">
            <h1 className="font-heading text-3xl font-bold text-[#F8FAFC] mb-4">
              Revisión de Entrenador
            </h1>
            <p className="text-[#A7AFBE] mb-8">
              ¿Aceptar a este entrenador como entrenador público?
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleReview('approve')}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-4 rounded-[18px] bg-[#22C55E] text-white font-semibold hover:bg-[#16A34A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Sí, aceptar
                  </>
                )}
              </button>
              <button
                onClick={() => handleReview('reject')}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-4 rounded-[18px] bg-[#EF4444] text-white font-semibold hover:bg-[#DC2626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <XCircle className="w-5 h-5" />
                    No, rechazar
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {result === 'success' && (
          <div className="bg-[#14161B] border border-[#22C55E]/20 rounded-[28px] p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-[#22C55E] mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-2">
              Revisión completada
            </h1>
            <p className="text-[#A7AFBE]">{message}</p>
          </div>
        )}

        {result === 'error' && (
          <div className="bg-[#14161B] border border-[#EF4444]/20 rounded-[28px] p-8 text-center">
            <XCircle className="w-16 h-16 text-[#EF4444] mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-2">
              Error
            </h1>
            <p className="text-[#A7AFBE]">{message}</p>
          </div>
        )}
      </div>
    </div>
  )
}

