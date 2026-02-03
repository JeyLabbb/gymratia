'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/portal', label: 'Overview', icon: LayoutDashboard },
  { href: '/portal/users', label: 'Usuarios', icon: Users },
  { href: '/portal/trainers', label: 'Entrenadores', icon: Dumbbell },
  { href: '/portal/requests', label: 'Solicitudes', icon: FileText },
  { href: '/portal/settings', label: 'Ajustes', icon: Settings },
]

export function PortalNav() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const NavContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/portal' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-[#FF2D2D]/20 text-[#FF2D2D]'
                : 'text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC]'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        )
      })}
    </>
  )

  return (
    <>
      {/* Mobile: sticky header con hamburger */}
      <header className="fixed top-0 left-0 right-0 z-40 md:hidden min-h-[calc(3rem+env(safe-area-inset-top))] flex items-center justify-between px-3 pt-[env(safe-area-inset-top)] pb-2 bg-[#0A0A0B]/95 backdrop-blur-sm border-b border-[rgba(255,255,255,0.08)]">
        <span className="font-heading text-lg font-bold text-[#F8FAFC]">Portal Gymratia</span>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-[#14161B] transition-colors touch-manipulation"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6 text-[#F8FAFC]" />
        </button>
      </header>

      {/* Mobile: overlay menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div className="relative flex flex-col min-h-full max-h-[100dvh] overflow-y-auto p-4 pt-14">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-[#14161B] text-[#A7AFBE] hover:text-[#F8FAFC] z-10 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[16px] overflow-hidden">
              <div className="p-2 space-y-0.5">
                <NavContent onItemClick={() => setMobileMenuOpen(false)} />
              </div>
              <div className="border-t border-[rgba(255,255,255,0.08)] p-2">
                <form action="/api/portal/logout" method="POST">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 px-3 py-3 rounded-lg text-sm text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop: sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-[rgba(255,255,255,0.08)] bg-[#0A0A0B]">
        <div className="p-4 border-b border-[rgba(255,255,255,0.08)]">
          <h1 className="font-heading text-lg font-bold text-[#F8FAFC]">Portal Gymratia</h1>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          <NavContent />
        </nav>
        <div className="p-2 border-t border-[rgba(255,255,255,0.08)]">
          <form action="/api/portal/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
