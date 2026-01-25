'use client'

import { Check, X } from 'lucide-react'
import { useState } from 'react'

type PermissionRequestProps = {
  requestId: string
  message: string
  onAccept: () => Promise<void>
  onReject: () => void
}

export function PermissionRequest({ requestId, message, onAccept, onReject }: PermissionRequestProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAccept = async () => {
    setIsProcessing(true)
    try {
      await onAccept()
    } catch (error) {
      console.error('Error accepting request:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 my-3 flex items-start gap-3">
      <div className="flex-1">
        <p className="text-sm text-[#A7AFBE] mb-2">{message}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22C55E] hover:bg-[#20B858] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            Aceptar
          </button>
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1D24] hover:bg-[#14161B] border border-[rgba(255,255,255,0.1)] text-[#A7AFBE] text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            Rechazar
          </button>
        </div>
      </div>
    </div>
  )
}





