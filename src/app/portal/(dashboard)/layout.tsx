import { redirect } from 'next/navigation'
import { getPortalSession } from '@/lib/portal-session'
import { PortalNav } from '../_components/PortalNav'

export default async function PortalDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getPortalSession()
  if (!session.email || !session.isAdmin) {
    redirect('/portal/login')
  }

  return (
    <div className="min-h-screen bg-[#050509] flex flex-col md:flex-row">
      <PortalNav />
      <main className="flex-1 overflow-auto pt-[calc(3rem+env(safe-area-inset-top))] md:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
