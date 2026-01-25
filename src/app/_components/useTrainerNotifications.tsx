'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'
import { personas } from '@/lib/personas'
import { TrainerNotificationPopup } from './TrainerNotificationPopup'

type Notification = {
  id: string
  trainerSlug: 'edu' | 'carolina'
  message: string
  chatId: string
}

export function useTrainerNotifications() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const lastCheckedRef = useRef<Record<string, string>>({})
  const activeTrainerSlugRef = useRef<'edu' | 'carolina' | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Detect if user is currently viewing a chat
  const getActiveTrainerSlug = (): 'edu' | 'carolina' | null => {
    if (pathname?.startsWith('/dashboard/chat/edu')) {
      return 'edu'
    }
    if (pathname?.startsWith('/dashboard/chat/carolina')) {
      return 'carolina'
    }
    return null
  }

  const activeTrainerSlug = getActiveTrainerSlug()
  activeTrainerSlugRef.current = activeTrainerSlug

  // Remove notifications for the active trainer when user enters their chat
  useEffect(() => {
    if (activeTrainerSlug) {
      setNotifications((prev) => 
        prev.filter((n) => n.trainerSlug !== activeTrainerSlug)
      )
    }
  }, [activeTrainerSlug])

  useEffect(() => {
    if (!user) {
      lastCheckedRef.current = {}
      setIsInitialized(false)
      return
    }

    // Initial check after a short delay
    const initTimeout = setTimeout(() => {
      checkForNewMessages(true)
      setIsInitialized(true)
    }, 2000)

    // Check for new messages every 3 seconds
    const interval = setInterval(() => {
      if (isInitialized) {
        checkForNewMessages()
      }
    }, 3000)

    return () => {
      clearTimeout(initTimeout)
      clearInterval(interval)
    }
  }, [user, isInitialized, pathname, activeTrainerSlug])

  const checkForNewMessages = async (isInitial = false) => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get all active chats
      const chatsResponse = await fetch('/api/chat', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!chatsResponse.ok) return

      const chatsData = await chatsResponse.json()
      const chats = chatsData.chats || []

      for (const chat of chats) {
        const trainer = personas.find((p) => p.slug === chat.trainer_slug)
        if (!trainer) continue

        // Get the last message for this chat
        const { data: messages, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (error || !messages || messages.length === 0) {
          // Initialize last checked time for this chat
          if (isInitial) {
            lastCheckedRef.current[chat.id] = new Date().toISOString()
          }
          continue
        }

        const lastMessage = messages[0]

        // Check if this is a new assistant message
        if (lastMessage.role === 'assistant') {
          const lastCheckedTime = lastCheckedRef.current[chat.id]
          const messageTime = new Date(lastMessage.created_at).getTime()

          // If we haven't checked this chat before, initialize it (don't show notification on first check)
          if (!lastCheckedTime) {
            lastCheckedRef.current[chat.id] = lastMessage.created_at
            continue
          }

          // If this message is newer than last checked
          if (messageTime > new Date(lastCheckedTime).getTime()) {
            // Only show notification if message is recent (within last 60 seconds)
            const now = Date.now()
            const messageAge = now - messageTime

            if (messageAge < 60000 && !isInitial) {
              // Don't show notification if user is currently viewing this trainer's chat
              const isViewingThisTrainer = activeTrainerSlugRef.current === chat.trainer_slug
              
              if (!isViewingThisTrainer) {
                // Show popup notification
                setNotifications((prev) => {
                  // Check if notification already exists for this chat
                  const exists = prev.some((n) => n.chatId === chat.id)
                  if (exists) return prev

                  return [
                    ...prev,
                    {
                      id: `${chat.id}-${lastMessage.id}`,
                      trainerSlug: chat.trainer_slug as 'edu' | 'carolina',
                      message: lastMessage.content,
                      chatId: chat.id,
                    },
                  ]
                })
              }

              // Update last checked time
              lastCheckedRef.current[chat.id] = lastMessage.created_at
            } else {
              // Just update the timestamp without showing notification
              lastCheckedRef.current[chat.id] = lastMessage.created_at
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking for new messages:', error)
    }
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return { notifications, removeNotification }
}

