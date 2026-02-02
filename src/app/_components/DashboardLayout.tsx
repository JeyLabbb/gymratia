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
  Compass,
  Settings,
  GraduationCap
} from 'lucide-react'
import { cn } from '@/lib/utils'

type DashboardLayoutProps = {
  children: React.ReactNode
  activeSection?: 'dashboard' | 'chat' | 'profile' | 'workouts' | 'diet'
}

type TrainerChat = {
  id: string
  trainer_slug: 'edu' | 'carolina' | 'jey'
  last_message_at?: string
  updated_at: string
  created_at?: string
}

export function DashboardLayout({ children, activeSection = 'dashboard' }: DashboardLayoutProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true) // Solo usado en desktop
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTrainer, setActiveTrainer] = useState<{ slug: 'edu' | 'carolina' | 'jey'; chatId?: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

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
          setActiveTrainer({ slug: 'jey' })
        }
      } else {
        setActiveTrainer({ slug: 'jey' })
      }
    } catch (error) {
      console.error('Error loading active trainer:', error)
      setActiveTrainer({ slug: 'jey' })
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
    : '/dashboard/chats'

  const navItems = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'chat', label: activeTrainerName ? `Chat con ${activeTrainerName}` : 'Chat', icon: MessageCircle, href: chatHref },
    { id: 'profile', label: 'Mi Perfil', icon: User, href: '/dashboard/profile' },
    { id: 'workouts', label: 'Entrenamientos', icon: Dumbbell, href: '/dashboard/workouts' },
    { id: 'diet', label: 'Dieta', icon: UtensilsCrossed, href: '/dashboard/diet' },
  ]

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden relative">
      {/* Mobile: sticky header with hamburger (solo móvil) */}
      <header className="fixed top-0 left-0 right-0 z-40 md:hidden min-h-[calc(3rem+env(safe-area-inset-top))] flex items-center justify-between px-3 pt-[env(safe-area-inset-top)] pb-2 bg-[#0A0A0B]/95 backdrop-blur-sm border-b border-[rgba(255,255,255,0.08)]">
        <Link href="/" className="text-lg font-heading font-extrabold tracking-tight">
          GymRat<span className="text-[#FF2D2D]">IA</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-[#14161B] transition-colors touch-manipulation"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6 text-[#F8FAFC]" />
        </button>
      </header>

      {/* Mobile: hamburger overlay menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          <div className="relative flex flex-col min-h-full max-h-[100dvh] overflow-y-auto p-4 pt-14">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-[#14161B] text-[#A7AFBE] hover:text-[#F8FAFC] z-10"
              aria-label="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[16px] overflow-hidden">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                const showBadge = item.id === 'chat' && unreadCount > 0
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3.5 transition-colors',
                      isActive ? 'bg-[#FF2D2D]/20 text-[#FF2D2D]' : 'text-[#F8FAFC] hover:bg-[#1A1D24]'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                    {showBadge && (
                      <span className="ml-auto rounded-full bg-[#FF2D2D] text-white text-xs font-bold px-2 py-0.5">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                )
              })}
              <div className="border-t border-[rgba(255,255,255,0.08)]" />
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-4 px-4 py-3.5 text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors"
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Inicio</span>
              </Link>
              <Link
                href="/explore"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-4 px-4 py-3.5 text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors"
              >
                <Compass className="w-5 h-5" />
                <span className="font-medium">Explorar</span>
              </Link>
              <Link
                href="/auth/mode-select"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-4 px-4 py-3.5 text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors"
              >
                <GraduationCap className="w-5 h-5" />
                <span className="font-medium">Cambiar modo</span>
              </Link>
              <Link
                href="/dashboard/profile?tab=settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-4 px-4 py-3.5 text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">Ajustes</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleSignOut()
                }}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-[#EF4444] hover:bg-[#1A1D24] transition-colors text-left"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - solo desktop (hidden on mobile) */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-full bg-[#14161B] border-r border-[rgba(255,255,255,0.08)] w-64 flex-shrink-0',
          !sidebarOpen && 'md:w-0 md:overflow-hidden md:border-0'
        )}
      >
        {sidebarOpen && (
          <>
            <div className="p-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
              <Link href="/" className="text-xl font-heading font-extrabold tracking-tight">
                GymRat<span className="text-[#FF2D2D]">IA</span>
              </Link>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-[#1A1D24] rounded-lg transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5 text-[#A7AFBE]" /> : <Menu className="w-5 h-5 text-[#A7AFBE]" />}
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                const showBadge = item.id === 'chat' && unreadCount > 0
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-[12px] transition-colors relative',
                      isActive ? 'bg-[#FF2D2D] text-[#F8FAFC]' : 'text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC]'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium flex-1 truncate">{item.label}</span>
                    {showBadge && (
                      <span className="rounded-full bg-[#FF2D2D] text-white text-xs font-bold w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
            <div className="p-4 border-t border-[rgba(255,255,255,0.08)]">
              <Link
                href="/"
                className="flex items-center gap-3 px-4 py-3 rounded-[12px] text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors"
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Inicio</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors mt-2"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Salir</span>
              </button>
            </div>
          </>
        )}
      </aside>

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-16 items-center justify-center bg-[#14161B] border border-r-0 border-[rgba(255,255,255,0.08)] rounded-r-lg hover:bg-[#1A1D24]"
        >
          <Menu className="w-4 h-4 text-[#A7AFBE]" />
        </button>
      )}

      {/* Main Content - pt para header móvil, pb para bottom nav */}
      <main className={cn(
        "flex-1 flex flex-col overflow-hidden relative min-w-0",
        "pt-[calc(3rem+env(safe-area-inset-top))] md:pt-0",
        "pb-[max(52px,calc(44px+env(safe-area-inset-bottom)))] md:pb-0"
      )}>
        {children}
      </main>

      {/* Mobile: bottom nav (solo móvil) - finita, safe-area */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex items-center justify-around min-h-[48px] px-1 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] bg-[#0A0A0B]/95 backdrop-blur-sm border-t border-[rgba(255,255,255,0.08)]">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          const showBadge = item.id === 'chat' && unreadCount > 0
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 rounded-lg transition-colors touch-manipulation',
                isActive ? 'text-[#FF2D2D]' : 'text-[#7B8291] active:text-[#F8FAFC]'
              )}
            >
              <span className="relative">
                <Icon className={cn('w-5 h-5', isActive && 'text-[#FF2D2D]')} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-[#FF2D2D] text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9' : unreadCount}
                  </span>
                )}
              </span>
              <span className={cn(
                'text-[10px] font-medium truncate max-w-full',
                isActive ? 'text-[#FF2D2D]' : 'text-[#7B8291]'
              )}>
                {item.id === 'dashboard' ? 'Resumen' : item.id === 'chat' ? 'Chat' : item.id === 'profile' ? 'Perfil' : item.id === 'workouts' ? 'Entrenos' : 'Dieta'}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

