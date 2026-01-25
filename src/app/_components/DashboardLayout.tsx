'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'
import { personas } from '@/lib/personas'
import Link from 'next/link'
import { 
  MessageCircle, 
  User, 
  Dumbbell, 
  UtensilsCrossed, 
  LogOut, 
  Menu,
  X,
  Home,
  LayoutDashboard,
  Compass
} from 'lucide-react'
import { cn } from '@/lib/utils'

type DashboardLayoutProps = {
  children: React.ReactNode
  activeSection?: 'dashboard' | 'chat' | 'profile' | 'workouts' | 'diet'
}

type TrainerChat = {
  id: string
  trainer_slug: 'edu' | 'carolina'
  last_message_at?: string
  updated_at: string
  created_at?: string
}

export function DashboardLayout({ children, activeSection = 'dashboard' }: DashboardLayoutProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  // En móvil, el sidebar está plegado por defecto. En desktop, abierto.
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 // md breakpoint
    }
    return true
  })
  const [activeTrainer, setActiveTrainer] = useState<{ slug: 'edu' | 'carolina', chatId?: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  // Detectar cambios de tamaño de ventana para mantener sidebar plegado en móvil
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (user) {
      loadActiveTrainer()
      loadUnreadCount()
      // Check for unread messages every 5 seconds
      const interval = setInterval(() => {
        loadUnreadCount()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [user])

  // Reload unread count when switching to chat section
  useEffect(() => {
    if (activeSection === 'chat' && user) {
      loadUnreadCount()
    }
  }, [activeSection, user])

  // Listen for chat-opened event to immediately update unread count
  useEffect(() => {
    const handleChatOpened = () => {
      loadUnreadCount()
    }

    window.addEventListener('chat-opened', handleChatOpened)
    return () => window.removeEventListener('chat-opened', handleChatOpened)
  }, [user])

  const loadActiveTrainer = async () => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/chat', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const chats: TrainerChat[] = data.chats || []
        
        if (chats.length > 0) {
          // Get most recent chat
          const sortedChats = [...chats].sort((a, b) => {
            const aDate = a.last_message_at || a.updated_at
            const bDate = b.last_message_at || b.updated_at
            return new Date(bDate).getTime() - new Date(aDate).getTime()
          })
          
          const mostRecent = sortedChats[0]
          setActiveTrainer({
            slug: mostRecent.trainer_slug,
            chatId: mostRecent.id
          })
        } else {
          // Default to edu if no chats
          setActiveTrainer({ slug: 'edu' })
        }
      } else {
        setActiveTrainer({ slug: 'edu' })
      }
    } catch (error) {
      console.error('Error loading active trainer:', error)
      setActiveTrainer({ slug: 'edu' })
    }
  }

  const loadUnreadCount = async () => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get all chats
      const response = await fetch('/api/chat', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) return

      const data = await response.json()
      const chats: TrainerChat[] = data.chats || []

      let totalUnread = 0

      // Check each chat for unread assistant messages
      for (const chat of chats) {
        // Get last assistant message
        const { data: lastAssistantMessage, error: msgError } = await supabase
          .from('chat_messages')
          .select('created_at')
          .eq('chat_id', chat.id)
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (msgError || !lastAssistantMessage) continue

        // Compare with last_message_at from chat (this is updated when user opens/views chat)
        const assistantTime = new Date(lastAssistantMessage.created_at).getTime()
        const lastReadTime = chat.last_message_at 
          ? new Date(chat.last_message_at).getTime()
          : new Date(chat.created_at || chat.updated_at || Date.now()).getTime()
        
        // If assistant message is newer than last_message_at, it's unread
        if (assistantTime > lastReadTime) {
          totalUnread++
        }
      }

      setUnreadCount(totalUnread)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const activeTrainerName = activeTrainer ? personas.find(p => p.slug === activeTrainer.slug)?.name : null
  const chatHref = activeTrainer 
    ? `/dashboard/chat/${activeTrainer.slug}${activeTrainer.chatId ? `?chatId=${activeTrainer.chatId}` : ''}`
    : '/dashboard/chat/edu'

  const navItems = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'chat', label: activeTrainerName ? `Chat con ${activeTrainerName}` : 'Chat', icon: MessageCircle, href: chatHref },
    { id: 'profile', label: 'Mi Perfil', icon: User, href: '/dashboard/profile' },
    { id: 'workouts', label: 'Entrenamientos', icon: Dumbbell, href: '/dashboard/workouts' },
    { id: 'diet', label: 'Dieta', icon: UtensilsCrossed, href: '/dashboard/diet' },
  ]

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden relative">
      {/* Mobile Menu Button - Always visible in mobile when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-3 left-3 z-50 p-2.5 bg-[#14161B] border border-[rgba(255,255,255,0.12)] rounded-lg hover:bg-[#1A1D24] transition-all shadow-lg md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5 text-[#F8FAFC]" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-[#14161B] border-r border-[rgba(255,255,255,0.08)] transition-all duration-300 flex flex-col h-full',
          // En móvil: drawer overlay con z-index alto, en desktop: sidebar normal
          sidebarOpen 
            ? 'w-64 fixed md:relative z-50 md:z-auto' 
            : 'w-0 md:w-0 md:relative'
        )}
      >
        <div className={cn(
          "p-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between",
          !sidebarOpen && "md:hidden"
        )}>
          {sidebarOpen && (
            <Link href="/" className="text-xl font-heading font-extrabold tracking-tight">
              GymRat<span className="text-[#FF2D2D]">IA</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#1A1D24] rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5 text-[#A7AFBE]" /> : <Menu className="w-5 h-5 text-[#A7AFBE]" />}
          </button>
        </div>

        <nav className={cn(
          'flex-1 p-2 sm:p-4 space-y-1 sm:space-y-2',
          !sidebarOpen && 'md:hidden'
        )}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            const showBadge = item.id === 'chat' && unreadCount > 0
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  // Cerrar sidebar en móvil al hacer clic
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false)
                  }
                }}
                className={cn(
                  'flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 rounded-[10px] sm:rounded-[12px] transition-colors relative',
                  isActive
                    ? 'bg-[#FF2D2D] text-[#F8FAFC]'
                    : 'text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC]'
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="font-medium flex-1 text-sm sm:text-base truncate">{item.label}</span>
                )}
                {showBadge && (
                  <span className={cn(
                    'rounded-full bg-[#FF2D2D] text-white text-xs font-bold flex items-center justify-center flex-shrink-0',
                    sidebarOpen ? 'w-5 h-5' : 'absolute -top-1 -right-1 w-4 h-4 text-[10px]'
                  )}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className={cn(
          "p-4 border-t border-[rgba(255,255,255,0.08)]",
          !sidebarOpen && "md:hidden"
        )}>
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-[12px] text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors"
          >
            <Home className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">Inicio</span>}
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors mt-2"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">Salir</span>}
          </button>
        </div>
      </aside>

      {/* Overlay para móvil cuando sidebar está abierto - más opaco para mejor visibilidad */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  )
}

