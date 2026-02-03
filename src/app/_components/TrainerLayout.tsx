'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'
import Link from 'next/link'
import {
  Users,
  Dumbbell,
  UtensilsCrossed,
  User,
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

type TrainerLayoutProps = {
  children: React.ReactNode
  activeSection?: 'dashboard' | 'students' | 'workouts' | 'diets' | 'profile'
}

const navItems = [
  { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard, href: '/trainers/dashboard' },
  { id: 'students', label: 'Alumnos', icon: Users, href: '/trainers/students', disabled: false },
  { id: 'workouts', label: 'Entrenamientos', icon: Dumbbell, href: '/trainers/content/workouts' },
  { id: 'diets', label: 'Dietas', icon: UtensilsCrossed, href: '/trainers/content/diets' },
  { id: 'profile', label: 'Tu perfil', icon: User, href: '/trainers/settings' },
]

export function TrainerLayout({ children, activeSection = 'dashboard' }: TrainerLayoutProps) {
  const { signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const resolvedSection = activeSection || (
    pathname.includes('/content/workouts') ? 'workouts' :
    pathname.includes('/content/diets') ? 'diets' :
    pathname.includes('/settings') ? 'profile' : 'dashboard'
  )

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden relative">
      {/* Mobile: header with hamburger */}
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

      {/* Mobile: hamburger overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)} />
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
                const isActive = resolvedSection === item.id
                return item.disabled ? (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3.5 text-[#5A6170] cursor-not-allowed opacity-60'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                    <span className="text-[10px] ml-auto">Próximamente</span>
                  </div>
                ) : (
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
                  </Link>
                )
              })}
              <div className="border-t border-[rgba(255,255,255,0.08)]" />
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors">
                <Home className="w-5 h-5" />
                <span className="font-medium">Inicio</span>
              </Link>
              <Link href="/explore" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors">
                <Compass className="w-5 h-5" />
                <span className="font-medium">Explorar</span>
              </Link>
              <Link href="/auth/mode-select" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors">
                <GraduationCap className="w-5 h-5" />
                <span className="font-medium">Cambiar modo</span>
              </Link>
              <button onClick={() => { setMobileMenuOpen(false); handleSignOut() }} className="w-full flex items-center gap-4 px-4 py-3.5 text-[#EF4444] hover:bg-[#1A1D24] transition-colors text-left">
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - desktop only */}
      <aside className={cn(
        'hidden md:flex flex-col h-full bg-[#14161B] border-r border-[rgba(255,255,255,0.08)] w-64 flex-shrink-0',
        !sidebarOpen && 'md:w-0 md:overflow-hidden md:border-0'
      )}>
        {sidebarOpen && (
          <>
            <div className="p-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
              <Link href="/" className="text-xl font-heading font-extrabold tracking-tight">
                GymRat<span className="text-[#FF2D2D]">IA</span>
              </Link>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-[#1A1D24] rounded-lg transition-colors">
                {sidebarOpen ? <X className="w-5 h-5 text-[#A7AFBE]" /> : <Menu className="w-5 h-5 text-[#A7AFBE]" />}
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = resolvedSection === item.id
                if (item.disabled) {
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 rounded-[12px] text-[#5A6170] cursor-not-allowed opacity-60">
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium flex-1 truncate">{item.label}</span>
                      <span className="text-[10px]">Próximamente</span>
                    </div>
                  )
                }
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
                  </Link>
                )
              })}
            </nav>
            <div className="p-4 border-t border-[rgba(255,255,255,0.08)]">
              <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-[12px] text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors">
                <Home className="w-5 h-5" />
                <span className="font-medium">Inicio</span>
              </Link>
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors mt-2">
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Salir</span>
              </button>
            </div>
          </>
        )}
      </aside>

      {!sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)} className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-16 items-center justify-center bg-[#14161B] border border-r-0 border-[rgba(255,255,255,0.08)] rounded-r-lg hover:bg-[#1A1D24]">
          <Menu className="w-4 h-4 text-[#A7AFBE]" />
        </button>
      )}

      {/* Main content */}
      <main className={cn(
        "flex-1 flex flex-col overflow-hidden relative min-w-0",
        "pt-[calc(3rem+env(safe-area-inset-top))] md:pt-0",
        "pb-[max(52px,calc(44px+env(safe-area-inset-bottom)))] md:pb-0"
      )}>
        {children}
      </main>

      {/* Mobile: bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex items-center justify-around min-h-[48px] px-1 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] bg-[#0A0A0B]/95 backdrop-blur-sm border-t border-[rgba(255,255,255,0.08)]">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = resolvedSection === item.id
          const label = item.id === 'dashboard' ? 'Resumen' : item.id === 'students' ? 'Alumnos' : item.id === 'workouts' ? 'Entrenos' : item.id === 'diets' ? 'Dietas' : 'Perfil'
          if (item.disabled) {
            return (
              <div key={item.id} className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 rounded-lg opacity-50 cursor-not-allowed">
                <Icon className="w-5 h-5 text-[#7B8291]" />
                <span className="text-[10px] font-medium text-[#7B8291] truncate max-w-full">{label}</span>
              </div>
            )
          }
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 rounded-lg transition-colors touch-manipulation',
                isActive ? 'text-[#FF2D2D]' : 'text-[#7B8291] active:text-[#F8FAFC]'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'text-[#FF2D2D]')} />
              <span className={cn('text-[10px] font-medium truncate max-w-full', isActive ? 'text-[#FF2D2D]' : 'text-[#7B8291]')}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
