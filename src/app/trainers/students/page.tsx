'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { Users } from 'lucide-react'
import { LoadingScreen } from '@/app/_components/LoadingScreen'

type StudentInfo = {
  user_id: string
  full_name: string | null
  email: string | null
}

export default function TrainerStudentsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [trainer, setTrainer] = useState<{ id: string; slug: string } | null>(null)
  const [students, setStudents] = useState<StudentInfo[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }
    if (user) loadData()
  }, [user, authLoading, router])

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: trainerData } = await supabase
        .from('trainers')
        .select('id, slug')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!trainerData) {
        router.push('/trainers/dashboard')
        return
      }
      setTrainer(trainerData)

      const res = await fetch('/api/trainer/students', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        setStudents([])
        return
      }
      const data = await res.json()
      setStudents(data.students || [])
    } catch (err) {
      console.error(err)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) return <LoadingScreen />
  if (!user) return null

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#F8FAFC] mb-2">Alumnos</h2>
        <p className="text-sm text-[#A7AFBE] mb-6">Alumnos con chat activo contigo.</p>
        {students.length === 0 ? (
          <div className="rounded-[16px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-8 text-center">
            <Users className="w-12 h-12 text-[#7B8291] mx-auto mb-4" />
            <p className="text-[#A7AFBE]">Aún no tienes alumnos con chat activo.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((s) => (
              <div
                key={s.user_id}
                className="flex items-center justify-between gap-4 p-4 rounded-[12px] bg-[#14161B] border border-[rgba(255,255,255,0.08)]"
              >
                <p className="font-medium text-[#F8FAFC] truncate">
                  {s.full_name || s.email || 'Sin nombre'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
