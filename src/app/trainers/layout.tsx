'use client'

import { usePathname } from 'next/navigation'
import { TrainerLayout } from '@/app/_components/TrainerLayout'

const ROUTES_WITH_NAV = ['/trainers/dashboard', '/trainers/content/workouts', '/trainers/content/diets', '/trainers/settings']

export default function TrainersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const useNav = ROUTES_WITH_NAV.some(r => pathname?.startsWith(r))
  const activeSection = pathname?.includes('/content/workouts') ? 'workouts' 
    : pathname?.includes('/content/diets') ? 'diets' 
    : pathname?.includes('/settings') ? 'profile' 
    : 'dashboard'

  if (!useNav) {
    return <>{children}</>
  }

  return (
    <TrainerLayout activeSection={activeSection}>
      {children}
    </TrainerLayout>
  )
}
