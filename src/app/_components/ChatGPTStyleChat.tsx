'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthProvider'
import { personas, getTrainerBySlug } from '@/lib/personas'
import { supabase } from '@/lib/supabase'
import { Send, Loader2, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatContentPanel } from './ChatContentPanel'
import { useSearchParams } from 'next/navigation'
import { MarkdownRenderer } from './MarkdownRenderer'
import { PermissionRequest } from './PermissionRequest'
import SafeImage from './SafeImage'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  permissionRequest?: {
    requestId: string
    message: string
    updateType: string
    updateData: any
  }
}

type ChatGPTStyleChatProps = {
  trainerSlug: 'edu' | 'carolina' | 'jey'
  chatId?: string
}

export function ChatGPTStyleChat({ trainerSlug, chatId: initialChatId }: ChatGPTStyleChatProps) {
  const { user } = useAuth()
  // Jey y Edu son entrenadores separados ahora
  const trainer = getTrainerBySlug(trainerSlug)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatId, setChatId] = useState<string | null>(initialChatId || null)
  const [sending, setSending] = useState(false)
  const [trainerAvatar, setTrainerAvatar] = useState<string | null>(null)
  const [trainerStats, setTrainerStats] = useState<{ averageRating: number; totalRatings: number } | null>(null)
  const [userRating, setUserRating] = useState<number | null>(null)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [contentPanelOpen, setContentPanelOpen] = useState(false)
  const [contentType, setContentType] = useState<'diet' | 'workout' | 'graph' | 'meal_planner' | 'progress_photos' | 'weight_graph' | null>(null)
  const [contentData, setContentData] = useState<any>(null)
  const [panelHeight, setPanelHeight] = useState(300)
  const [isResizing, setIsResizing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const welcomeSentRef = useRef(false)
  const initializingRef = useRef(false)
  const resizeRef = useRef<HTMLDivElement>(null)
  const manuallyClosedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentPanelRef = useRef<HTMLDivElement>(null)
  const messagesAreaRef = useRef<HTMLDivElement>(null)
  const mainContentAreaRef = useRef<HTMLDivElement>(null)
  const resizeStartRef = useRef<{ 
    mouseY: number; 
    panelHeight: number; 
    containerTop: number;
    containerHeight: number;
    resizerHeight: number;
    resizerTopRelative: number;
  } | null>(null)
  const resizeRafRef = useRef<number | null>(null)
  const searchParams = useSearchParams()

  // Cargar avatar y estadísticas del entrenador desde BD
  useEffect(() => {
    const loadTrainerData = async () => {
      if (!trainer || !user) return
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Buscar avatar y estadísticas con el slug del trainer (jey, edu, carolina son separados)
        const { data: trainerData } = await supabase
          .from('trainers')
          .select('avatar_url, average_rating, total_ratings')
          .eq('slug', trainerSlug)
          .maybeSingle()
        
        if (trainerData) {
          if (trainerData.avatar_url) {
            setTrainerAvatar(trainerData.avatar_url)
          }
          if (trainerData.average_rating || trainerData.total_ratings) {
            setTrainerStats({
              averageRating: trainerData.average_rating || 0,
              totalRatings: trainerData.total_ratings || 0
            })
          }
        }

        // Cargar valoración del usuario
        const ratingResponse = await fetch(`/api/trainer/rate?trainerSlug=${trainerSlug}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (ratingResponse.ok) {
          const ratingData = await ratingResponse.json()
          setUserRating(ratingData.userRating)
        }
      } catch (error) {
        console.error('Error loading trainer data:', error)
      }
    }
    
    loadTrainerData()
  }, [trainerSlug, trainer, user])

  const handleRatingClick = async (rating: number) => {
    if (!user || submittingRating) return

    try {
      setSubmittingRating(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/trainer/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          trainerSlug,
          rating,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setUserRating(rating)
        setTrainerStats({
          averageRating: data.averageRating,
          totalRatings: data.totalRatings,
        })
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
    } finally {
      setSubmittingRating(false)
    }
  }

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

      // Usar el trainerSlug directamente (BD ahora acepta 'jey', 'edu', 'carolina')
      const normalizedTrainerSlug = trainerSlug

      // Check if user has existing chat with this trainer
      const { data: existingChats } = await supabase
        .from('trainer_chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('trainer_slug', normalizedTrainerSlug)
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
            trainer_slug: normalizedTrainerSlug,
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating chat:', error)
          // Mostrar error más detallado
          if (error.message) {
            console.error('Error message:', error.message)
            console.error('Error details:', error.details)
            console.error('Error hint:', error.hint)
          }
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
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Server error:', errorData)
        throw new Error(errorData.error || `Failed to send message (${response.status})`)
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

      // Handle actions (open content panels)
      if (data.actions && data.actions.length > 0) {
        // Collect all meal planner actions to merge them
        const mealPlannerActions = data.actions.filter((a: any) => a.type === 'OPEN_MEAL_PLANNER')
        
        for (const action of data.actions) {
          if (action.type === 'OPEN_DIET') {
            setContentType('diet')
            setContentData(action.data)
            setContentPanelOpen(true)
          } else if (action.type === 'OPEN_MEAL_PLANNER') {
            setContentType('meal_planner')
            // If there are multiple meal planner actions, merge them into an array
            if (mealPlannerActions.length > 1) {
              const mergedData = mealPlannerActions.map((a: any) => ({
                date: a.data.date,
                meals: a.data.meals || []
              }))
              setContentData(mergedData)
            } else {
              setContentData(action.data)
            }
            setContentPanelOpen(true)
            // Dispatch event to notify other components (like diet page) that meal plan was created/updated
            // Add a small delay to ensure the meal plan is saved in the database first
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('meal-plan-updated'))
            }, 1000)
          } else if (action.type === 'OPEN_GRAPH') {
            setContentType('graph')
            setContentData(action.data)
            setContentPanelOpen(true)
          } else if (action.type === 'OPEN_WORKOUT') {
            setContentType('workout')
            // Reload workout data to get the latest from database
            loadWorkoutData()
            setContentPanelOpen(true)
            // Dispatch event to notify other components (like workouts page) that workout was updated
            window.dispatchEvent(new CustomEvent('workout-updated'))
          } else if (action.type === 'OPEN_PROGRESS_PHOTOS') {
            setContentType('progress_photos')
            setContentData(action.data)
            setContentPanelOpen(true)
          } else if (action.type === 'OPEN_WEIGHT_GRAPH') {
            setContentType('weight_graph')
            setContentData(action.data)
            setContentPanelOpen(true)
          }
        }
      }

      // Handle permission requests
      let permissionRequest = null
      if (data.requests && data.requests.length > 0) {
        const request = data.requests[0] // Take the first request
        if (request.type === 'PROFILE_UPDATE' && request.data) {
          permissionRequest = {
            requestId: `request-${Date.now()}`,
            message: request.data.message || '¿Quieres que actualice esto en tu perfil?',
            updateType: request.data.updateType,
            updateData: request.data.updateData,
          }
        }
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString(),
        permissionRequest: permissionRequest || undefined,
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

  // RESIZE - Direct calculation, panel follows cursor exactly
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!resizeStartRef.current || !contentPanelRef.current || !messagesAreaRef.current || !mainContentAreaRef.current) {
        return
      }

      const { mouseY: startMouseY, containerTop, containerHeight, resizerHeight, resizerTopRelative } = resizeStartRef.current
      const currentMouseY = e.clientY
      
      // Calculate mouse delta
      const mouseDeltaY = currentMouseY - startMouseY
      
      // Calculate new resizer position: initial position + mouse delta
      // Recalculate container top in case it moved (e.g., due to layout changes)
      const currentContainerTop = mainContentAreaRef.current.getBoundingClientRect().top
      const newResizerTopRelative = resizerTopRelative + mouseDeltaY
      
      // Calculate panel height: container height - resizer position - resizer height
      // This keeps the resizer exactly under the cursor
      const newPanelHeight = containerHeight - newResizerTopRelative - resizerHeight
      
      // Clamp values
      const minHeight = 200
      const maxHeight = containerHeight * 0.8
      const finalPanelHeight = Math.max(minHeight, Math.min(maxHeight, newPanelHeight))
      
      // Calculate messages area height
      const messagesHeight = containerHeight - finalPanelHeight - resizerHeight

      // Update DOM immediately - no requestAnimationFrame for instant feedback
      contentPanelRef.current.style.height = `${finalPanelHeight}px`
      messagesAreaRef.current.style.height = `${messagesHeight}px`
    }

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Cancel any pending animation frame
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current)
        resizeRafRef.current = null
      }

      // Calculate final height from current mouse position using same logic
      if (resizeStartRef.current && contentPanelRef.current && mainContentAreaRef.current) {
        const { mouseY: startMouseY, containerHeight, resizerHeight, resizerTopRelative } = resizeStartRef.current
        const finalMouseY = e.clientY
        
        // Calculate mouse delta
        const mouseDeltaY = finalMouseY - startMouseY
        
        // Calculate new resizer position
        const newResizerTopRelative = resizerTopRelative + mouseDeltaY
        
        // Calculate panel height
        const newPanelHeight = containerHeight - newResizerTopRelative - resizerHeight
        
        // Clamp values
        const minHeight = 200
        const maxHeight = containerHeight * 0.8
        const finalPanelHeight = Math.max(minHeight, Math.min(maxHeight, newPanelHeight))
        
        // Update state with exact final position
        setPanelHeight(finalPanelHeight)
      }

      setIsResizing(false)
      resizeStartRef.current = null
    }

    // Setup
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'row-resize'
    document.body.classList.add('resizing')

    document.addEventListener('mousemove', handleMouseMove, { passive: false })
    document.addEventListener('mouseup', handleMouseUp, { passive: false })
    const handleBlur = () => handleMouseUp({} as MouseEvent)
    window.addEventListener('blur', handleBlur)

    return () => {
      // Cancel any pending animation frame
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current)
        resizeRafRef.current = null
      }
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('blur', handleBlur as any)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.body.classList.remove('resizing')
    }
  }, [isResizing])

  // Check for query params to open panels
  useEffect(() => {
    const openDietPanel = searchParams?.get('openDietPanel')
    const openMealPlanPanel = searchParams?.get('openMealPlanPanel')
    const openWorkoutPanel = searchParams?.get('openWorkoutPanel')
    const selectedDate = searchParams?.get('selectedDate')
    const dietId = searchParams?.get('dietId')
    
    if (openDietPanel === 'true' && !contentPanelOpen) {
      setContentType('diet')
      if (dietId) {
        // Load diet data if dietId is provided
        loadDietData(dietId)
      } else {
        setContentData(null)
      }
      setContentPanelOpen(true)
    } else if (openMealPlanPanel === 'true' && !contentPanelOpen) {
      setContentType('meal_planner')
      setContentData({ selectedDate: selectedDate || null })
      setContentPanelOpen(true)
    } else if (openWorkoutPanel === 'true' && !contentPanelOpen) {
      setContentType('workout')
      // Load active workout if exists, otherwise set to null (empty state)
      loadWorkoutData()
      setContentPanelOpen(true)
    }
  }, [searchParams, contentPanelOpen])

  const loadWorkoutData = async () => {
    if (!user) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/workouts?trainerSlug=${trainerSlug}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const workouts = data.workouts || []
        const active = workouts.find((w: any) => w.is_active) || workouts[0] || null
        setContentData(active)
        // Dispatch event to notify other components (like workouts page) that workout was loaded/updated
        window.dispatchEvent(new CustomEvent('workout-updated'))
      }
    } catch (error) {
      console.error('Error loading workout data:', error)
      setContentData(null)
    }
  }

  const loadDietData = async (dietId: string) => {
    if (!user) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/diet?id=${dietId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const diet = data.diet
        if (diet) {
          setContentData({
            title: diet.title,
            description: diet.description,
            ...diet.diet_data,
            daily_calories: diet.daily_calories,
            daily_protein: diet.daily_protein_g,
            daily_carbs: diet.daily_carbs_g,
            daily_fats: diet.daily_fats_g,
          })
        }
      }
    } catch (error) {
      console.error('Error loading diet data:', error)
    }
  }

  // Handle actions from API response
  useEffect(() => {
    // This will be called when API returns actions
    const handleActions = (actions: any[]) => {
      if (!actions || actions.length === 0) return
      
      // Don't auto-open panel if user manually closed it
      if (manuallyClosedRef.current) return

      for (const action of actions) {
        if (action.type === 'OPEN_DIET') {
          setContentType('diet')
          setContentData(action.data)
          setContentPanelOpen(true)
        } else if (action.type === 'OPEN_MEAL_PLANNER') {
          setContentType('meal_planner')
          setContentData(action.data)
          setContentPanelOpen(true)
        } else if (action.type === 'OPEN_GRAPH') {
          setContentType('graph')
          setContentData(action.data)
          setContentPanelOpen(true)
        } else if (action.type === 'OPEN_WORKOUT') {
          setContentType('workout')
          // Reload workout data to get the latest from database
          loadWorkoutData()
          setContentPanelOpen(true)
          // Dispatch event to notify other components (like workouts page) that workout was updated
          window.dispatchEvent(new CustomEvent('workout-updated'))
        }
      }
    }

    // Listen for custom events from API
    const handleMessage = (e: CustomEvent) => {
      if (e.detail?.actions) {
        handleActions(e.detail.actions)
      }
    }

    window.addEventListener('chat-actions' as any, handleMessage as EventListener)
    return () => window.removeEventListener('chat-actions' as any, handleMessage as EventListener)
  }, [])

  const closeContentPanel = () => {
    manuallyClosedRef.current = true
    setContentPanelOpen(false)
    setContentType(null)
    setContentData(null)
    // Reset the flag after a short delay to allow new actions to open the panel
    setTimeout(() => {
      manuallyClosedRef.current = false
    }, 1000)
  }

  if (!trainer) {
    return <div>Trainer not found</div>
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#0A0A0B] relative">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.08)] bg-[#14161B] px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          {trainerAvatar ? (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-[rgba(255,255,255,0.1)]">
              <SafeImage
                src={trainerAvatar}
                alt={trainer.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-sm sm:text-lg">
              {trainer.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-base sm:text-lg font-bold text-[#F8FAFC] truncate">{trainer.name}</h2>
            <p className="text-xs text-[#A7AFBE] line-clamp-1">{trainer.headline}</p>
            {/* Componente de valoración sutil */}
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5">
              <span className="text-[9px] sm:text-[10px] text-[#6B7280] hidden sm:inline">Valora a este entrenador:</span>
              <span className="text-[9px] sm:text-[10px] text-[#6B7280] sm:hidden">Valorar:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(null)}
                    disabled={submittingRating}
                    className={cn(
                      "transition-all duration-150",
                      submittingRating && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Star
                      className={cn(
                        "w-3.5 h-3.5 transition-colors",
                        (hoveredRating !== null && star <= hoveredRating) || (userRating !== null && star <= userRating)
                          ? "text-[#FFD166] fill-current"
                          : "text-[#4B5563] hover:text-[#FFD166]/60"
                      )}
                    />
                  </button>
                ))}
              </div>
              {userRating && (
                <span className="text-[10px] text-[#9CA3AF] ml-1">
                  ({userRating}/5)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Split horizontally */}
      <div ref={mainContentAreaRef} className="flex-1 flex flex-col overflow-hidden">
        {/* Messages Area - Top */}
        <div 
          ref={messagesAreaRef}
          className={cn(
            "overflow-y-auto px-0",
            contentPanelOpen ? "flex-shrink-0" : "flex-1"
          )}
          style={contentPanelOpen ? { height: `calc(100% - ${panelHeight}px - 16px)`, transition: isResizing ? 'none' : 'height 0.2s ease' } : {}}
        >
        <div className="max-w-3xl mx-auto px-4 py-8">
          {loading && messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-[#FF2D2D]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#FF2D2D]/10 flex items-center justify-center mb-4 sm:mb-6">
                {trainerAvatar ? (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-[#FF2D2D]">
                    <SafeImage
                      src={trainerAvatar}
                      alt={trainer.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-xl sm:text-2xl">
                    {trainer.name[0]}
                  </div>
                )}
              </div>
              <h3 className="font-heading text-lg sm:text-2xl font-bold text-[#F8FAFC] mb-1 sm:mb-2">
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
                    'flex gap-2 sm:gap-4',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    trainerAvatar ? (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-[rgba(255,255,255,0.1)] flex-shrink-0">
                        <SafeImage
                          src={trainerAvatar}
                          alt={trainer.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-sm flex-shrink-0">
                        {trainer.name[0]}
                      </div>
                    )
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-[14px] sm:rounded-[18px] px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base',
                      message.role === 'user'
                        ? 'bg-[#FF2D2D] text-[#F8FAFC]'
                        : 'bg-[#14161B] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC]'
                    )}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      <MarkdownRenderer content={message.content} />
                    </div>
                    {message.permissionRequest && (
                      <div className="mt-3">
                        <PermissionRequest
                          requestId={message.permissionRequest.requestId}
                          message={message.permissionRequest.message}
                          onAccept={async () => {
                            try {
                              const { data: { session } } = await supabase.auth.getSession()
                              if (!session) throw new Error('No session')

                              const response = await fetch('/api/profile/update-request', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${session.access_token}`,
                                },
                                body: JSON.stringify({
                                  updateType: message.permissionRequest!.updateType,
                                  updateData: message.permissionRequest!.updateData,
                                }),
                              })

                              if (!response.ok) {
                                const errorData = await response.json()
                                throw new Error(errorData.error || 'Failed to update profile')
                              }

                              // Remove the permission request from the message
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === message.id
                                    ? { ...m, permissionRequest: undefined }
                                    : m
                                )
                              )

                              // Show success message
                              const successMessage: Message = {
                                id: `success-${Date.now()}`,
                                role: 'assistant',
                                content: '✅ Actualizado correctamente.',
                                created_at: new Date().toISOString(),
                              }
                              setMessages((prev) => [...prev, successMessage])
                            } catch (error: any) {
                              console.error('Error accepting request:', error)
                              alert(`Error: ${error.message || 'No se pudo actualizar el perfil'}`)
                            }
                          }}
                          onReject={() => {
                            // Remove the permission request from the message
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === message.id
                                  ? { ...m, permissionRequest: undefined }
                                  : m
                              )
                            )
                          }}
                        />
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#A7AFBE] text-[10px] sm:text-xs font-medium flex-shrink-0">
                      Tú
                    </div>
                  )}
                </div>
              ))}
              {sending && (
                <div className="flex gap-2 sm:gap-4 justify-start">
                    {trainerAvatar ? (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-[rgba(255,255,255,0.1)] flex-shrink-0">
                        <SafeImage
                          src={trainerAvatar}
                          alt={trainer.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-xs sm:text-sm flex-shrink-0">
                        {trainer.name[0]}
                      </div>
                    )}
                  <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[14px] sm:rounded-[18px] px-3 py-2 sm:px-4 sm:py-3">
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-[#FF2D2D]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        </div>

        {/* Resizer */}
        {contentPanelOpen && (
          <div
            ref={resizeRef}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              
              // Capture initial state from actual DOM
              if (contentPanelRef.current && mainContentAreaRef.current && resizeRef.current) {
                const containerRect = mainContentAreaRef.current.getBoundingClientRect()
                const resizerRect = resizeRef.current.getBoundingClientRect()
                
                // Calculate resizer position relative to container top
                const resizerTopRelative = resizerRect.top - containerRect.top
                
                resizeStartRef.current = {
                  mouseY: e.clientY,
                  panelHeight: contentPanelRef.current.getBoundingClientRect().height,
                  containerTop: containerRect.top,
                  containerHeight: containerRect.height,
                  resizerHeight: resizerRect.height,
                  resizerTopRelative: resizerTopRelative
                }
                setIsResizing(true)
              }
            }}
            className="h-4 bg-[#14161B] border-y border-[rgba(255,255,255,0.08)] cursor-row-resize hover:bg-[#1A1D24] hover:border-[#FF2D2D]/50 active:bg-[#FF2D2D]/20 transition-colors flex items-center justify-center group select-none relative z-50"
            style={{ 
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              cursor: 'row-resize'
            }}
          >
            <div className="w-20 h-1 bg-[#7B8291] group-hover:bg-[#FF2D2D] transition-colors rounded-full" />
          </div>
        )}

        {/* Content Panel - Bottom */}
        {contentPanelOpen && contentType && (
          <div
            ref={contentPanelRef}
            className="flex-shrink-0"
            style={{ height: `${panelHeight}px`, transition: isResizing ? 'none' : 'height 0.2s ease' }}
          >
            <ChatContentPanel
              isOpen={contentPanelOpen}
              contentType={contentType}
              contentData={contentData}
              onClose={closeContentPanel}
              onEdit={() => {
                // TODO: Implement edit functionality
                console.log('Edit requested for', contentType)
              }}
              activeTrainerSlug={trainerSlug}
            />
          </div>
        )}
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
              className="absolute right-1.5 sm:right-2 bottom-1.5 sm:bottom-2 p-1.5 sm:p-2 rounded-full bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

