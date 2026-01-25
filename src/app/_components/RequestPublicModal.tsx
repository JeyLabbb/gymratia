'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type RequestPublicModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  trainer: {
    id: string
    visibility_status: string
    avatar_url?: string
    hasCertificates?: boolean
    social_handle?: string
    social_proof?: string
    description?: string
  }
}

export function RequestPublicModal({ isOpen, onClose, onSuccess, trainer }: RequestPublicModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  if (!isOpen) return null

  const handleRequest = async () => {
    if (!acceptedTerms) {
      setError('Debes aceptar los términos para continuar')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('No estás autenticado')
        setLoading(false)
        return
      }

      const response = await fetch('/api/trainer/request-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        setError(data.error || 'Error al enviar la solicitud')
        if (data.missingFields) {
          setError(`Faltan campos obligatorios: ${data.missingFields.join(', ')}`)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const missingFields: string[] = []
  if (!trainer.hasCertificates) missingFields.push('Certificado/título (archivo)')
  if (!trainer.social_handle) missingFields.push('Usuario/handle de redes sociales')
  if (!trainer.social_proof) missingFields.push('Clientes satisfechos o prueba social')
  if (!trainer.description) missingFields.push('Descripción/bio')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[28px] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-2xl font-bold text-[#F8FAFC]">
            Solicitar aparecer en público
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#1A1D24] transition-colors"
          >
            <X className="w-5 h-5 text-[#A7AFBE]" />
          </button>
        </div>

        {missingFields.length > 0 && (
          <div className="mb-6 p-4 rounded-[16px] bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-400 mb-2">
                  Faltan campos obligatorios:
                </p>
                <ul className="text-sm text-yellow-300 space-y-1 mb-3">
                  {missingFields.map((field, idx) => (
                    <li key={idx}>• {field}</li>
                  ))}
                </ul>
                <p className="text-xs text-yellow-200/80 mb-3">
                  Completa estos campos en tu perfil antes de solicitar aparecer en público.
                </p>
                <button
                  onClick={() => {
                    onClose()
                    router.push('/trainers/settings')
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 transition-colors text-sm font-medium"
                >
                  Ir a completar campos
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <p className="text-[#A7AFBE]">
            Al solicitar aparecer en público, tu perfil será revisado manualmente. 
            Una vez aprobado, aparecerás en la lista de entrenadores públicos de la app.
          </p>

          <div className="p-4 rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)]">
            <h3 className="text-sm font-semibold text-[#F8FAFC] mb-2">Requisitos mínimos:</h3>
            <ul className="text-sm text-[#A7AFBE] space-y-1">
              <li className="flex items-start gap-2">
                {trainer.hasCertificates ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span className="text-sm text-[#A7AFBE]">Certificado/título (archivo)</span>
                  <p className="text-xs text-[#6B7280] mt-0.5">Debes subir al menos un archivo de certificado o título</p>
                </div>
              </li>
              <li className="flex items-center gap-2">
                {trainer.social_handle ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <X className="w-4 h-4 text-red-400" />
                )}
                Usuario/handle de redes sociales
              </li>
              <li className="flex items-start gap-2">
                {trainer.social_proof ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span className="text-sm text-[#A7AFBE]">Clientes satisfechos o prueba social</span>
                  <p className="text-xs text-[#6B7280] mt-0.5">Puedes escribir texto, subir imágenes o archivos. Cuéntanos sobre testimonios, resultados o información que respalde tu validez como entrenador.</p>
                </div>
              </li>
              <li className="flex items-center gap-2">
                {trainer.description ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <X className="w-4 h-4 text-red-400" />
                )}
                Descripción/bio
              </li>
            </ul>
          </div>

          <label className="flex items-start gap-3 p-4 rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] cursor-pointer hover:border-[#FF2D2D]/50 transition-colors">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#F8FAFC]">
                Acepto los términos y condiciones para aparecer como entrenador público
              </p>
              <p className="text-xs text-[#A7AFBE] mt-1">
                Entiendo que mi perfil será revisado y que debo cumplir con los requisitos mínimos.
              </p>
            </div>
          </label>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#A7AFBE] hover:text-[#F8FAFC] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleRequest}
            disabled={loading || missingFields.length > 0 || !acceptedTerms}
            className="flex-1 px-6 py-3 rounded-[16px] bg-[#FF2D2D] text-white font-semibold hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </div>
      </div>
    </div>
  )
}

