'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  FileText,
  Settings,
  LogOut,
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

  return (
    <aside className="w-56 flex-shrink-0 border-r border-[rgba(255,255,255,0.08)] bg-[#0A0A0B] flex flex-col">
      <div className="p-4 border-b border-[rgba(255,255,255,0.08)]">
        <h1 className="font-heading text-lg font-bold text-[#F8FAFC]">Portal Gymratia</h1>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/portal' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#FF2D2D]/20 text-[#FF2D2D]'
                  : 'text-[#A7AFBE] hover:bg-[#1A1D24] hover:text-[#F8FAFC]'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
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
  )
}
