'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Dumbbell } from 'lucide-react'
import { WorkoutExcelTable } from '@/app/_components/WorkoutExcelTable'
import { useToast, ToastContainer } from '@/app/_components/Toast'
import { LoadingScreen } from '@/app/_components/LoadingScreen'

type Workout = {
  id: string
  title: string
  description?: string
  workout_data?: any
  is_active: boolean
  trainer_slug: string
}

export default function StudentWorkoutsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const studentId = params.studentId as string
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState<string>('')
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }
    if (user && studentId) loadData()
  }, [user, authLoading, studentId, router])

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`/api/workouts?studentId=${studentId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        if (res.status === 403) {
          router.push('/trainers/students')
          return
        }
        throw new Error('Error cargando entrenamientos')
      }
      const data = await res.json()
      const list = data.workouts || []
      setWorkouts(list)
      const active = list.find((w: Workout) => w.is_active) || list[0] || null
      setActiveWorkout(active)
      setSelectedWorkoutId(active?.id || null)

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', studentId)
        .single()
      setStudentName(profile?.full_name || 'Alumno')
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) return <LoadingScreen />
  if (!user) return null

  const displayedWorkout = selectedWorkoutId
    ? workouts.find((w) => w.id === selectedWorkoutId) || activeWorkout
    : activeWorkout

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-6 sm:py-8">
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      <div className="max-w-7xl mx-auto space-y-4">
        <Link
          href="/trainers/students"
          className="inline-flex items-center gap-2 text-sm text-[#A7AFBE] hover:text-[#FF2D2D] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Alumnos
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#FF2D2D]/10 border border-[#FF2D2D]/30">
            <Dumbbell className="w-5 h-5 text-[#FF2D2D]" />
          </div>
          <div>
            <h2 className="font-heading text-lg sm:text-xl font-bold text-[#F8FAFC]">
              Tabla de {studentName}
            </h2>
            <p className="text-xs text-[#A7AFBE]">Modo entrenador: puedes editar reps y pesos</p>
          </div>
        </div>
        {workouts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {workouts.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWorkoutId(w.id)}
                className={`px-4 py-2 rounded-[10px] text-sm font-medium transition-colors ${
                  selectedWorkoutId === w.id
                    ? 'bg-[#FF2D2D] text-white'
                    : 'bg-[#1A1D24] text-[#A7AFBE] hover:bg-[#24282F] hover:text-[#F8FAFC]'
                }`}
              >
                {w.title}
              </button>
            ))}
          </div>
        )}
        {displayedWorkout ? (
          <WorkoutExcelTable
            workout={displayedWorkout}
            onUpdate={loadData}
            coachMode
            studentId={studentId}
          />
        ) : (
          <div className="rounded-[16px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-8 text-center">
            <p className="text-[#A7AFBE]">Este alumno no tiene entrenamientos asignados.</p>
          </div>
        )}
      </div>
    </div>
  )
}
