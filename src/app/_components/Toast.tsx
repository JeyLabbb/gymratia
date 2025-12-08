'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export type Toast = {
  id: string
  message: string
  type: ToastType
  duration?: number
}

type ToastProps = {
  toast: Toast
  onClose: (id: string) => void
}

function ToastComponent({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10)

    // Auto close
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose(toast.id), 300) // Wait for animation
    }, toast.duration || 5000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onClose])

  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
    warning: Bell,
  }

  const styles = {
    success: 'bg-[#10B981]/20 border-[#10B981]/50 text-[#10B981]',
    error: 'bg-[#EF4444]/20 border-[#EF4444]/50 text-[#EF4444]',
    info: 'bg-[#3B82F6]/20 border-[#3B82F6]/50 text-[#3B82F6]',
    warning: 'bg-[#F59E0B]/20 border-[#F59E0B]/50 text-[#F59E0B]',
  }

  const Icon = icons[toast.type]

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-[16px] border backdrop-blur-sm shadow-lg min-w-[320px] max-w-[420px] transition-all duration-300',
        styles[toast.type],
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(() => onClose(toast.id), 300)
        }}
        className="p-1 rounded-lg hover:bg-black/10 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

type ToastContainerProps = {
  toasts: Toast[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastComponent toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  )
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
    const id = Math.random().toString(36).substring(7)
    const newToast: Toast = { id, message, type, duration }
    setToasts((prev) => [...prev, newToast])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return {
    toasts,
    showToast,
    removeToast,
    success: (message: string, duration?: number) => showToast(message, 'success', duration),
    error: (message: string, duration?: number) => showToast(message, 'error', duration),
    info: (message: string, duration?: number) => showToast(message, 'info', duration),
    warning: (message: string, duration?: number) => showToast(message, 'warning', duration),
  }
}


