'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthProvider'
import { personas } from '@/lib/personas'
import { supabase } from '@/lib/supabase'
import { Send, Loader2 } from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

type TrainerChatProps = {
  trainerSlug: 'edu' | 'carolina'
  chatId?: string
  onChatCreated?: (chatId: string) => void
}

export function TrainerChat({ trainerSlug, chatId: initialChatId, onChatCreated }: TrainerChatProps) {
  const { user } = useAuth()
  const trainer = personas.find((p) => p.slug === trainerSlug)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatId, setChatId] = useState<string | null>(initialChatId || null)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatId) {
      loadMessages()
    }
  }, [chatId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    if (!chatId || !user) return

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/chat?chatId=${chatId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
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

  const sendMessage = async () => {
    if (!inputValue.trim() || sending || !user) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setSending(true)

    // Add user message optimistically
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No session')
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          chatId: chatId || undefined,
          message: userMessage,
          trainerSlug,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Update chatId if it's a new chat
      if (!chatId && data.chatId) {
        setChatId(data.chatId)
        onChatCreated?.(data.chatId)
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => {
        // Remove temp message and add real ones
        const filtered = prev.filter((m) => !m.id.startsWith('temp'))
        return [...filtered, tempUserMessage, assistantMessage]
      })
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp')))
      setInputValue(userMessage) // Restore input
    } finally {
      setSending(false)
    }
  }

  if (!trainer) {
    return <div>Trainer not found</div>
  }

  return (
    <div className="flex flex-col h-full bg-[#0A0A0B]">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.08)] bg-[#14161B] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-lg">
            {trainer.name[0]}
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-[#F8FAFC]">{trainer.name}</h2>
            <p className="text-xs text-[#A7AFBE]">{trainer.headline}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-[#FF2D2D]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-[#FF2D2D]/10 flex items-center justify-center mb-4">
              <div className="w-8 h-8 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold">
                {trainer.name[0]}
              </div>
            </div>
            <p className="text-[#A7AFBE] text-sm max-w-sm">
              Inicia una conversación con {trainer.name}. Pregúntale sobre entrenamiento, nutrición o cualquier duda.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] md:max-w-[60%] rounded-[18px] px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-[#FF2D2D] text-[#F8FAFC] rounded-br-sm'
                    : 'bg-[#14161B] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] rounded-bl-sm'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs mt-1.5 opacity-60">
                  {new Date(message.created_at).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[rgba(255,255,255,0.08)] bg-[#14161B] px-6 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Escribe un mensaje a ${trainer.name}...`}
            className="flex-1 rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || sending}
            className="rounded-[16px] bg-[#FF2D2D] text-[#F8FAFC] px-6 py-3 font-medium hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[100px]"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}


