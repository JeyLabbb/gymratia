'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthProvider'
import { personas } from '@/lib/personas'
import { supabase } from '@/lib/supabase'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

type ChatGPTStyleChatProps = {
  trainerSlug: 'edu' | 'carolina'
  chatId?: string
}

export function ChatGPTStyleChat({ trainerSlug, chatId: initialChatId }: ChatGPTStyleChatProps) {
  const { user } = useAuth()
  const trainer = personas.find((p) => p.slug === trainerSlug)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatId, setChatId] = useState<string | null>(initialChatId || null)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const welcomeSentRef = useRef(false)
  const initializingRef = useRef(false)

  useEffect(() => {
    if (chatId && user && trainer) {
      loadMessages()
      checkNotifications()
      markMessagesAsRead()
      checkAndSendWelcomeMessage()
    } else if (user && trainer && !chatId && !initializingRef.current) {
      // If no chatId, get or create chat first
      initializingRef.current = true
      initializeChat()
    }
  }, [chatId, user, trainer])

  const initializeChat = async () => {
    if (!user || !trainer) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Check if user has existing chat with this trainer
      const { data: existingChats } = await supabase
        .from('trainer_chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('trainer_slug', trainerSlug)
        .order('created_at', { ascending: false })
        .limit(1)

      let finalChatId: string | null = null

      if (existingChats && existingChats.length > 0) {
        finalChatId = existingChats[0].id
      } else {
        // Create new chat
        const { data: newChat, error } = await supabase
          .from('trainer_chats')
          .insert({
            user_id: user.id,
            trainer_slug: trainerSlug,
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating chat:', error)
          return
        }

        if (newChat) {
          finalChatId = newChat.id
        }
      }

      if (finalChatId) {
        setChatId(finalChatId)
        initializingRef.current = false
        // Load messages first
        loadMessages(finalChatId)
        // After setting chatId, check for welcome message
        setTimeout(() => {
          checkAndSendWelcomeMessage(finalChatId)
        }, 300)
      } else {
        initializingRef.current = false
      }
    } catch (error) {
      console.error('Error initializing chat:', error)
    }
  }

  const checkAndSendWelcomeMessage = async (targetChatId?: string) => {
    const currentChatId = targetChatId || chatId
    if (!currentChatId || !user || !trainer || welcomeSentRef.current) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Check if chat has any messages
      const { data: existingMessages } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('chat_id', currentChatId)
        .limit(1)

      // If no messages, send welcome message
      if (!existingMessages || existingMessages.length === 0) {
        welcomeSentRef.current = true

        // Generate welcome message via API
        const response = await fetch('/api/trainer/welcome', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            trainerSlug: trainerSlug,
            chatId: currentChatId,
          }),
        })

        if (response.ok) {
          // Reload messages to show welcome message
          setTimeout(() => {
            loadMessages(currentChatId)
          }, 300)
        } else {
          welcomeSentRef.current = false // Reset if failed
        }
      }
    } catch (error) {
      console.error('Error sending welcome message:', error)
      welcomeSentRef.current = false // Reset if error
    }
  }

  const markMessagesAsRead = async () => {
    if (!chatId || !user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get the latest assistant message timestamp
      const { data: lastAssistantMessage } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('chat_id', chatId)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Update chat's last_message_at to the latest assistant message (or current time if no messages)
      const timestamp = lastAssistantMessage?.created_at || new Date().toISOString()
      
      await supabase
        .from('trainer_chats')
        .update({ 
          last_message_at: timestamp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chatId)

      // Trigger a custom event to update the unread count in the sidebar
      window.dispatchEvent(new CustomEvent('chat-opened', { detail: { chatId } }))
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const checkNotifications = async () => {
    if (!user || !trainerSlug) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/trainer-notifications?trainerSlug=${trainerSlug}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const unreadNotifications = data.notifications || []
        
        if (unreadNotifications.length > 0) {
          // Show notification badge or auto-send a message from trainer
          const latestNotification = unreadNotifications[0]
          
          // Auto-add a message from trainer acknowledging the change
          if (latestNotification.notification_type === 'profile_change') {
            const notificationMessage: Message = {
              id: `notification-${latestNotification.id}`,
              role: 'assistant',
              content: `📝 ${latestNotification.message} ¿Quieres que ajuste tu plan de entrenamiento en base a estos cambios?`,
              created_at: new Date().toISOString(),
            }
            
            setMessages((prev) => {
              // Check if notification message already exists
              if (prev.some(m => m.id === notificationMessage.id)) {
                return prev
              }
              return [...prev, notificationMessage]
            })

            // Mark notification as read
            await fetch('/api/trainer-notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                notificationId: latestNotification.id
              }),
            })
          }
        }
      }
    } catch (error) {
      console.error('Error checking notifications:', error)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async (targetChatId?: string) => {
    const currentChatId = targetChatId || chatId
    if (!currentChatId || !user) return

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/chat?chatId=${currentChatId}`, {
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
        // Mark as read when new chat is created
        setTimeout(() => markMessagesAsRead(), 100)
      } else if (chatId) {
        // Mark as read after sending message (user has seen the conversation)
        setTimeout(() => markMessagesAsRead(), 100)
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.id.startsWith('temp'))
        return [...filtered, tempUserMessage, assistantMessage]
      })
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp')))
      setInputValue(userMessage)
    } finally {
      setSending(false)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
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

      {/* Messages Area - ChatGPT Style */}
      <div className="flex-1 overflow-y-auto px-0">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {loading && messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-[#FF2D2D]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-16 h-16 rounded-full bg-[#FF2D2D]/10 flex items-center justify-center mb-6">
                <div className="w-12 h-12 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-2xl">
                  {trainer.name[0]}
                </div>
              </div>
              <h3 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-2">
                {trainer.name}
              </h3>
              <p className="text-[#A7AFBE] text-sm max-w-md mb-8">
                {trainer.headline}
              </p>
              <p className="text-[#7B8291] text-sm">
                Inicia una conversación con {trainer.name}. Pregúntale sobre entrenamiento, nutrición o cualquier duda.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-4',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-sm flex-shrink-0">
                      {trainer.name[0]}
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-[18px] px-4 py-3',
                      message.role === 'user'
                        ? 'bg-[#FF2D2D] text-[#F8FAFC]'
                        : 'bg-[#14161B] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC]'
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#A7AFBE] text-xs font-medium flex-shrink-0">
                      Tú
                    </div>
                  )}
                </div>
              ))}
              {sending && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-sm flex-shrink-0">
                    {trainer.name[0]}
                  </div>
                  <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[18px] px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-[#FF2D2D]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area - ChatGPT Style */}
      <div className="border-t border-[rgba(255,255,255,0.08)] bg-[#14161B] px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage()
            }}
            className="relative"
          >
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Escribe un mensaje a ${trainer.name}...`}
              rows={1}
              className="w-full rounded-[20px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 pr-12 text-[#F8FAFC] placeholder:text-[#7B8291] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] focus:border-transparent resize-none max-h-32 overflow-y-auto [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || sending}
              className="absolute right-2 bottom-2 p-2 rounded-full bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <p className="text-xs text-[#7B8291] mt-2 text-center">
            {trainer.name} puede cometer errores. Verifica información importante.
          </p>
        </div>
      </div>
    </div>
  )
}

