'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { StartButton } from './StartButton'
import { User, GraduationCap, Compass, Bell, Settings, LogOut, ChevronDown, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MessagesPanel } from './MessagesPanel'
import { ToggleTutorial } from './ToggleTutorial'

type UserProfile = {
  full_name?: string
}

export function PersonalizedNavbar() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [hasTrainerProfile, setHasTrainerProfile] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [userMode, setUserMode] = useState<'student' | 'trainer'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('user_mode') as 'student' | 'trainer') || 'student'
    }
    return 'student'
  })

  useEffect(() => {
    if (user && !authLoading) {
      loadProfile()
      checkTrainerProfile()
      loadUnreadCount()
      // Sincronizar modo con la ruta actual
      syncModeWithRoute()
    }
  }, [user, authLoading])

  const loadUnreadCount = async () => {
    if (!user) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/messages', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const unread = (data.messages || []).filter((m: any) => !m.read_at).length
        setUnreadCount(unread)
      }
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  // Sincronizar modo desde localStorage y cambios de ruta
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const syncMode = () => {
      const savedMode = localStorage.getItem('user_mode') as 'student' | 'trainer' | null
      const preferredMode = localStorage.getItem('preferred_mode') as 'student' | 'trainer' | null
      const mode = savedMode || preferredMode || 'student'
      if (mode !== userMode) {
        setUserMode(mode)
      }
    }
    
    const handleRouteChange = () => {
      syncModeWithRoute()
      syncMode()
    }
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_mode' || e.key === 'preferred_mode') {
        syncMode()
      }
    }
    
    // Sincronizar al cargar
    syncMode()
    syncModeWithRoute()
    
    // Escuchar cambios de ruta
    window.addEventListener('popstate', handleRouteChange)
    
    // Escuchar cambios en localStorage
    window.addEventListener('storage', handleStorageChange)
    
    // Escuchar evento personalizado de cambio de modo
    window.addEventListener('modechange', syncMode)
    
    // También verificar periódicamente para cambios en la misma ventana
    const interval = setInterval(() => {
      syncMode()
    }, 500)
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('modechange', syncMode)
      clearInterval(interval)
    }
  }, [userMode])

  const syncModeWithRoute = () => {
    if (typeof window === 'undefined') return
    
    const path = window.location.pathname
    if (path.startsWith('/trainers/dashboard') || path.startsWith('/trainers/register')) {
      setUserMode('trainer')
      localStorage.setItem('user_mode', 'trainer')
    } else if (path.startsWith('/dashboard') || path.startsWith('/onboarding')) {
      setUserMode('student')
      localStorage.setItem('user_mode', 'student')
    }
  }

  const checkTrainerProfile = async () => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      setHasTrainerProfile(!!trainer)
    } catch (error) {
      console.error('Error checking trainer profile:', error)
    }
  }

  const handleModeChange = async (mode: 'student' | 'trainer') => {
    // Cambiar modo inmediatamente
    setUserMode(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_mode', mode)
      localStorage.setItem('preferred_mode', mode)
      // Disparar evento personalizado para que la página principal se actualice
      window.dispatchEvent(new Event('modechange'))
    }
    
    if (!user) {
      // Si no está logueado, recargar la página para mostrar el contenido correcto
      window.location.reload()
      return
    }

    // Si está logueado, redirigir a la página principal para que se actualice
    router.push('/')
    // Forzar actualización del componente
    setTimeout(() => {
      router.refresh()
    }, 100)
  }

  const loadProfile = async () => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/user/profile', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const userName = profile?.full_name || user?.email?.split('@')[0] || null
  const displayName = userName ? userName.split(' ')[0] : null

  return (
    <nav className="sticky top-0 z-50 min-h-[56px] sm:h-[72px] border-b border-[rgba(255,255,255,0.08)] bg-[#0A0A0B]/80 backdrop-blur-sm">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 flex items-center justify-between h-full min-h-[56px]">
        <Link href="/" className="text-xl font-heading font-extrabold tracking-tight">
          GymRat<span className="text-[#FF2D2D]">IA</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {user ? (
            // Cuando está logueado: solo Explorar
            <Link href="/explore" className="flex items-center gap-1.5 text-[#F8FAFC] hover:text-[#FF2D2D] transition-colors text-sm">
              <Compass className="w-4 h-4" />
              Explorar
            </Link>
          ) : (
            // Cuando NO está logueado: Entrenadores y Explorar
            <>
              <Link href="/trainers" className="text-[#F8FAFC] hover:text-[#FF2D2D] transition-colors text-sm">Entrenadores</Link>
              <Link href="/explore" className="flex items-center gap-1.5 text-[#F8FAFC] hover:text-[#FF2D2D] transition-colors text-sm">
                <Compass className="w-4 h-4" />
                Explorar
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            data-mobile-nav
            onClick={() => setShowMobileMenu(true)}
            className="md:hidden p-2.5 rounded-xl hover:bg-[#14161B] transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6 text-[#F8FAFC]" />
          </button>
          {user && displayName && (
            <span className="hidden md:block text-sm text-[#A7AFBE]">
              Hola, <span className="text-[#FF2D2D] font-medium">{displayName}</span>
            </span>
          )}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="relative p-2 rounded-lg hover:bg-[#14161B] transition-colors flex items-center gap-1"
              >
                <Bell className="w-5 h-5 text-[#A7AFBE] hover:text-[#FF2D2D] transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FF2D2D] text-white text-xs font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                <ChevronDown className="w-4 h-4 text-[#A7AFBE]" />
              </button>
              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-3 w-56 max-h-[min(70vh,400px)] overflow-y-auto bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[16px] shadow-xl z-[100]">
                    <button
                      onClick={() => {
                        setShowMessages(true)
                        setShowUserMenu(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-[#F8FAFC] hover:bg-[#1A1D24] transition-colors"
                    >
                      <Bell className="w-4 h-4" />
                      <span>Mensajes{unreadCount > 0 && ` (${unreadCount})`}</span>
                    </button>
                    <Link
                      href={userMode === 'trainer' ? '/trainers/dashboard?tab=settings' : '/dashboard/profile?tab=settings'}
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-[#F8FAFC] hover:bg-[#1A1D24] transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Ajustes de cuenta</span>
                    </Link>
                    <div className="border-t border-[rgba(255,255,255,0.08)]" />
                    <button
                      onClick={async () => {
                        await signOut()
                        setShowUserMenu(false)
                        router.push('/')
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-[#EF4444] hover:bg-[#1A1D24] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {user ? (
            <>
              {/* Toggle de modo Entrenador/Alumno cuando está logueado */}
              <div 
                data-toggle-mode
                className="hidden md:flex items-center gap-2 bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-1"
              >
                <button
                  onClick={() => handleModeChange('student')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-medium transition-all',
                    userMode === 'student'
                      ? 'bg-[#FF2D2D] text-white shadow-[0_0_20px_rgba(255,45,45,0.3)]'
                      : 'text-[#A7AFBE] hover:text-[#F8FAFC]'
                  )}
                >
                  <User className="w-4 h-4" />
                  <span>Alumno</span>
                </button>
                <button
                  onClick={() => handleModeChange('trainer')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-medium transition-all',
                    userMode === 'trainer'
                      ? 'bg-[#FF2D2D] text-white shadow-[0_0_20px_rgba(255,45,45,0.3)]'
                      : 'text-[#A7AFBE] hover:text-[#F8FAFC]'
                  )}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Entrenador</span>
                </button>
              </div>
              <Link
                href={userMode === 'trainer' ? '/trainers/dashboard' : '/dashboard'}
                className="inline-flex items-center justify-center rounded-[16px] font-medium transition-all bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] shadow-[0_0_40px_rgba(255,45,45,0.25)] px-6 py-3 text-sm whitespace-nowrap"
              >
                {userMode === 'trainer' ? 'Mi Panel' : 'Mi Dashboard'}
              </Link>
            </>
          ) : (
            <>
              {/* Toggle de modo Entrenador/Alumno */}
              <div 
                data-toggle-mode
                className="hidden md:flex items-center gap-2 bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-1"
              >
                <button
                  onClick={() => handleModeChange('student')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-medium transition-all',
                    userMode === 'student'
                      ? 'bg-[#FF2D2D] text-white shadow-[0_0_20px_rgba(255,45,45,0.3)]'
                      : 'text-[#A7AFBE] hover:text-[#F8FAFC]'
                  )}
                >
                  <User className="w-4 h-4" />
                  <span>Alumno</span>
                </button>
                <button
                  onClick={() => handleModeChange('trainer')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-medium transition-all',
                    userMode === 'trainer'
                      ? 'bg-[#FF2D2D] text-white shadow-[0_0_20px_rgba(255,45,45,0.3)]'
                      : 'text-[#A7AFBE] hover:text-[#F8FAFC]'
                  )}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Entrenador</span>
                </button>
              </div>
              <StartButton text="Comenzar" size="md" showArrow={false} />
            </>
          )}
        </div>
      </div>
      {user && (
        <MessagesPanel
          isOpen={showMessages}
          onClose={() => {
            setShowMessages(false)
            loadUnreadCount()
          }}
        />
      )}

      {/* Menú móvil full-screen */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowMobileMenu(false)} />
          <div className="relative flex flex-col min-h-screen p-6 pt-16">
            <button
              onClick={() => setShowMobileMenu(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-[#14161B] text-[#A7AFBE] hover:text-[#F8FAFC]"
              aria-label="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  handleModeChange(userMode === 'student' ? 'trainer' : 'student')
                  setShowMobileMenu(false)
                }}
                className="flex items-center gap-4 p-5 rounded-2xl bg-[#14161B] border border-[rgba(255,255,255,0.08)] text-left hover:border-[#FF2D2D]/50 transition-all"
              >
                {userMode === 'student' ? (
                  <GraduationCap className="w-8 h-8 text-[#FF2D2D]" />
                ) : (
                  <User className="w-8 h-8 text-[#FF2D2D]" />
                )}
                <div>
                  <span className="block font-heading text-xl text-[#F8FAFC]">
                    Cambiar a modo {userMode === 'student' ? 'Entrenador' : 'Alumno'}
                  </span>
                  <span className="text-sm text-[#7B8291]">Alternar entre entrenar y gestionar</span>
                </div>
              </button>
              <Link
                href="/explore"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-4 p-5 rounded-2xl bg-[#14161B] border border-[rgba(255,255,255,0.08)] text-left hover:border-[#FF2D2D]/50 transition-all"
              >
                <Compass className="w-8 h-8 text-[#FF2D2D]" />
                <div>
                  <span className="block font-heading text-xl text-[#F8FAFC]">Explorar</span>
                  <span className="text-sm text-[#7B8291]">Descubre entrenadores y contenido</span>
                </div>
              </Link>
              {!user && (
                <Link
                  href="/trainers"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-4 p-5 rounded-2xl bg-[#14161B] border border-[rgba(255,255,255,0.08)] text-left hover:border-[#FF2D2D]/50 transition-all"
                >
                  <GraduationCap className="w-8 h-8 text-[#A7AFBE]" />
                  <div>
                    <span className="block font-heading text-xl text-[#F8FAFC]">Entrenadores</span>
                    <span className="text-sm text-[#7B8291]">Conoce a los entrenadores IA</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <ToggleTutorial />
    </nav>
  )
}


