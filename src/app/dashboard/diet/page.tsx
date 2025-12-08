'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { DashboardLayout } from '@/app/_components/DashboardLayout'

export default function DietPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-[#F8FAFC]">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <DashboardLayout activeSection="diet">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-6">Mi Dieta</h2>
          <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-8">
            <p className="text-[#A7AFBE]">Próximamente: Recomendaciones nutricionales, productos, seguimiento...</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


