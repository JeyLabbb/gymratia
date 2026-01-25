'use client'

import { useState, useEffect } from 'react'
import { X, Bell, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Message = {
  id: string
  type: string
  title: string
  body: string
  read_at: string | null
  created_at: string
}

type MessagesPanelProps = {
  isOpen: boolean
  onClose: () => void
}

export function MessagesPanel({ isOpen, onClose }: MessagesPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadMessages()
    }
  }, [isOpen])

  const loadMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/messages', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch('/api/messages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ messageId })
      })

      setMessages(messages.map(msg => 
        msg.id === messageId ? { ...msg, read_at: new Date().toISOString() } : msg
      ))
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  const unreadCount = messages.filter(m => !m.read_at).length

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        // Cerrar si se hace click fuera del contenido
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[28px] p-6 max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-[#FF2D2D]" />
            <h2 className="font-heading text-2xl font-bold text-[#F8FAFC]">
              Mensajes
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 rounded-full bg-[#FF2D2D] text-white text-xs font-medium">
                  {unreadCount}
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#1A1D24] transition-colors"
          >
            <X className="w-5 h-5 text-[#A7AFBE]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#FF2D2D] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#A7AFBE]">No tienes mensajes</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                onClick={() => !message.read_at && markAsRead(message.id)}
                className={`p-4 rounded-[16px] border cursor-pointer transition-colors ${
                  message.read_at
                    ? 'bg-[#1A1D24] border-[rgba(255,255,255,0.08)]'
                    : 'bg-[#1A1D24] border-[#FF2D2D]/30 hover:border-[#FF2D2D]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-[#F8FAFC] flex-1">
                    {message.title}
                  </h3>
                  {!message.read_at && (
                    <div className="w-2 h-2 rounded-full bg-[#FF2D2D] flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-sm text-[#A7AFBE] mb-2">{message.body}</p>
                <p className="text-xs text-[#7B8291]">
                  {new Date(message.created_at).toLocaleString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

