'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { DashboardLayout } from '@/app/_components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { 
  Dumbbell, 
  Plus, 
  Calendar,
  MessageSquare,
  ArrowRight,
  Download,
  History,
  Info
} from 'lucide-react'
import { personas, getTrainerBySlug } from '@/lib/personas'
import { WorkoutExcelTable } from '@/app/_components/WorkoutExcelTable'
import { useToast, ToastContainer } from '@/app/_components/Toast'
import { LoadingScreen } from '@/app/_components/LoadingScreen'
import SafeImage from '@/app/_components/SafeImage'

type Workout = {
  id: string
  title: string
  description?: string
  start_date?: string
  end_date?: string
  workout_data?: any
  is_active: boolean
  trainer_slug: string
  created_at: string
}

export default function WorkoutsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [activeTrainers, setActiveTrainers] = useState<Array<'edu' | 'carolina' | 'jey'>>([])
  const [trainerAvatars, setTrainerAvatars] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadWorkouts()
      loadTrainerAvatars()
      // Check if we should open workout panel from query params
      const params = new URLSearchParams(window.location.search)
      const openWorkout = params.get('openWorkout')
      const trainer = params.get('trainer') as 'edu' | 'carolina' | null
      if (openWorkout === 'true' && trainer) {
        handleStartWorkoutConversation(trainer)
      }
    }
  }, [user])

  const loadTrainerAvatars = async () => {
    try {
      // Cargar avatares para Carolina, Edu y Jey (entrenadores separados)
      const trainersToLoad = ['carolina', 'edu', 'jey']
      const avatars: Record<string, string> = {}
      
      for (const slug of trainersToLoad) {
        try {
          const { data: trainerData } = await supabase
            .from('trainers')
            .select('avatar_url')
            .eq('slug', slug)
            .maybeSingle()
          
          if (trainerData?.avatar_url) {
            avatars[slug] = trainerData.avatar_url
          }
        } catch (error) {
          console.error(`Error loading avatar for ${slug}:`, error)
        }
      }
      
      console.log('Loaded trainer avatars:', avatars) // Debug
      setTrainerAvatars(avatars)
    } catch (error) {
      console.error('Error loading trainer avatars:', error)
    }
  }

  const loadWorkouts = async (onComplete?: (workouts: Workout[]) => void) => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get active trainers (trainers with active chats) - ALWAYS fetch this first
      const chatsResponse = await fetch('/api/chat', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      // Siempre mostrar Carolina, Edu y Jey como entrenadores separados
      const availableTrainersList: Array<'edu' | 'carolina' | 'jey'> = ['carolina', 'edu', 'jey']
      setActiveTrainers(availableTrainersList)

      // Load workouts
      const response = await fetch('/api/workouts', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const allWorkouts = data.workouts || []
        setWorkouts(allWorkouts)
        
        // Find active workout
        const active = allWorkouts.find((w: Workout) => w.is_active) || allWorkouts[0] || null
        setActiveWorkout(active)
        if (!selectedWorkoutId) {
          setSelectedWorkoutId(active?.id || null)
        }
        
        if (onComplete) {
          onComplete(allWorkouts)
        }
      }
    } catch (error) {
      console.error('Error loading workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartWorkoutConversation = (trainerSlug: 'edu' | 'carolina' | 'jey') => {
    // Navigate to chat with query param to open workout panel
    router.push(`/dashboard/chat/${trainerSlug}?openWorkoutPanel=true`)
  }

  const handleExportToExcel = async () => {
    if (!activeWorkout || !user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get exercise logs for this workout
      const logsResponse = await fetch(`/api/exercise-logs?workoutId=${activeWorkout.id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!logsResponse.ok) return

      const logsData = await logsResponse.json()
      const logs = logsData.logs || []

      // Create Excel data
      const rows: any[] = []
      
      // Header row
      rows.push(['Ejercicio', 'Fecha', 'Serie', 'Reps', 'Peso (kg)', 'Tempo', 'Descanso (s)', 'Notas'])

      // Data rows
      logs.forEach((log: any) => {
        const sets = log.sets || []
        sets.forEach((set: any, idx: number) => {
          rows.push([
            log.exercise_name,
            log.date,
            set.set_number || idx + 1,
            set.reps || '',
            set.weight_kg || '',
            set.tempo || '',
            set.rest_seconds || '',
            set.notes || log.notes || ''
          ])
        })
      })

      // Convert to CSV (simple Excel format)
      const csv = rows.map(row => 
        row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n')

      // Download
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${activeWorkout.title}_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Entrenamiento exportado correctamente')
    } catch (error) {
      console.error('Error exporting workout:', error)
      toast.error('Error al exportar el entrenamiento')
    }
  }

  const getTrainerName = (slug: string) => {
    return personas.find(p => p.slug === slug)?.name || slug
  }

  const activeWorkouts = workouts.filter(w => w.is_active)
  const inactiveWorkouts = workouts.filter(w => !w.is_active)

  if (authLoading || loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return null
  }

  const hasActiveWorkout = activeWorkout !== null
  // Always show active workout by default, unless explicitly selecting from history
  const displayedWorkout = selectedWorkoutId && showHistory
    ? workouts.find(w => w.id === selectedWorkoutId) || activeWorkout
    : activeWorkout

  return (
    <DashboardLayout activeSection="workouts">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-heading text-3xl font-bold text-[#F8FAFC] mb-2">Mis Entrenamientos</h2>
              <p className="text-[#A7AFBE]">Gestiona tus rutinas y sigue tu progreso</p>
            </div>
            {hasActiveWorkout && (
              <button
                onClick={handleExportToExcel}
                className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] hover:bg-[#24282F] transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </button>
            )}
          </div>

          {!hasActiveWorkout ? (
            /* Empty State - CTA to start */
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-6 sm:p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-[#FF2D2D]/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Dumbbell className="w-6 h-6 sm:w-10 sm:h-10 text-[#FF2D2D]" />
                </div>
                <h3 className="font-heading text-lg sm:text-2xl font-bold text-[#F8FAFC] mb-2 sm:mb-3">
                  Comienza tu entrenamiento
                </h3>
                <p className="text-xs sm:text-base text-[#A7AFBE] mb-4 sm:mb-8">
                  Habla con tu entrenador para crear una rutina personalizada.
                </p>
                
                {activeTrainers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-8 max-w-4xl mx-auto">
                    {personas
                      .filter(trainer => {
                        // Mostrar jey y carolina siempre (independientemente de is_active)
                        return trainer.slug === 'jey' || trainer.slug === 'carolina'
                      })
                      .map((trainer) => {
                        // Buscar avatar con el slug del trainer (jey, edu, carolina son separados)
                        const avatar = trainerAvatars[trainer.slug]
                        
                        return (
                        <button
                          key={trainer.slug}
                          onClick={() => {
                            // Usar el slug directamente (jey, edu, carolina son separados)
                            handleStartWorkoutConversation(trainer.slug as 'edu' | 'carolina' | 'jey')
                          }}
                          className="bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[16px] p-4 sm:p-6 hover:border-[#FF2D2D]/50 transition-all"
                        >
                          {avatar ? (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-[#FF2D2D] mx-auto mb-2 sm:mb-3">
                              <SafeImage
                                src={avatar}
                                alt={trainer.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-lg sm:text-xl mx-auto mb-2 sm:mb-3">
                              {trainer.name[0]}
                            </div>
                          )}
                          <h4 className="font-heading font-bold text-sm sm:text-base text-[#F8FAFC] mb-1">{trainer.name}</h4>
                          <p className="text-xs text-[#A7AFBE] mb-2 sm:mb-3 line-clamp-2">{trainer.headline}</p>
                          <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-[#FF2D2D]">
                            <span>Empezar</span>
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                          </div>
                        </button>
                        )
                      })}
                  </div>
                ) : (
                  <div className="bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-6 mb-8">
                    <p className="text-sm text-[#A7AFBE] text-center">
                      No tienes chats activos con ningún entrenador. Ve a la sección de Chat para comenzar una conversación.
                    </p>
                  </div>
                )}

                <p className="text-xs text-[#7B8291]">
                  Tu entrenador creará una rutina personalizada y podrás hacer seguimiento de tu progreso día a día
                </p>
              </div>
            </div>
          ) : (
            /* Active Workout View */
            <div className="space-y-4 sm:space-y-6">
              {/* Workout Selector */}
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <h3 className="font-heading text-base sm:text-xl font-bold text-[#F8FAFC]">
                      {displayedWorkout?.title}
                    </h3>
                    {displayedWorkout?.is_active && (
                      <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#FF2D2D]/10 text-[#FF2D2D] text-xs font-medium">
                        Activo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {inactiveWorkouts.length > 0 && (
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 px-3 py-2 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] hover:bg-[#24282F] transition-colors text-sm"
                      >
                        <History className="w-4 h-4" />
                        {showHistory ? 'Ocultar' : 'Historial'}
                      </button>
                    )}
                    <button
                      onClick={() => displayedWorkout && handleStartWorkoutConversation(displayedWorkout.trainer_slug as 'edu' | 'carolina' | 'jey')}
                      className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors text-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Hablar con {displayedWorkout && getTrainerName(displayedWorkout.trainer_slug)}
                    </button>
                  </div>
                </div>

                {displayedWorkout?.description && (
                  <p className="text-sm text-[#A7AFBE] mb-4">{displayedWorkout.description}</p>
                )}

                {showHistory && inactiveWorkouts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                    <p className="text-sm text-[#A7AFBE] mb-3">Entrenamientos anteriores:</p>
                    <div className="flex flex-wrap gap-2">
                      {inactiveWorkouts.map((workout) => (
                        <button
                          key={workout.id}
                          onClick={() => {
                            setSelectedWorkoutId(workout.id)
                            setShowHistory(false)
                          }}
                          className={`px-3 py-1.5 rounded-[8px] text-sm transition-colors ${
                            selectedWorkoutId === workout.id
                              ? 'bg-[#FF2D2D] text-[#F8FAFC]'
                              : 'bg-[#1A1D24] text-[#A7AFBE] hover:bg-[#24282F]'
                          }`}
                        >
                          {workout.title}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setSelectedWorkoutId(activeWorkout.id)
                          setShowHistory(false)
                        }}
                        className={`px-3 py-1.5 rounded-[8px] text-sm transition-colors ${
                          selectedWorkoutId === activeWorkout.id
                            ? 'bg-[#FF2D2D] text-[#F8FAFC]'
                            : 'bg-[#1A1D24] text-[#A7AFBE] hover:bg-[#24282F]'
                        }`}
                      >
                        {activeWorkout.title} (Activo)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Message */}
              <div className="bg-gradient-to-r from-[#FF2D2D]/10 to-[#FF2D2D]/5 border border-[#FF2D2D]/20 rounded-[16px] p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-[8px] bg-[#FF2D2D]/20 flex-shrink-0">
                    <Info className="w-4 h-4 text-[#FF2D2D]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#F8FAFC] leading-relaxed">
                      Si tienes alguna preferencia o quieres cambiar cosas, puedes modificarlas manualmente en la tabla, o pedirle a tu entrenador que te lo cambie.
                    </p>
                  </div>
                </div>
              </div>

              {/* Workout Table */}
              {displayedWorkout && (() => {
                // Extract week number from title (format: "Title - Semana X" or just "Title")
                const weekMatch = displayedWorkout.title.match(/Semana (\d+)/i)
                const weekNumber = weekMatch ? parseInt(weekMatch[1], 10) : 1
                
                // Find all workouts with the same base title (for navigation)
                const baseTitle = displayedWorkout.title.replace(/\s*-\s*Semana \d+/i, '').trim()
                const relatedWorkouts = workouts.filter(w => {
                  const wBaseTitle = w.title.replace(/\s*-\s*Semana \d+/i, '').trim()
                  return wBaseTitle === baseTitle
                }).sort((a, b) => {
                  const aWeek = a.title.match(/Semana (\d+)/i)?.[1] || '0'
                  const bWeek = b.title.match(/Semana (\d+)/i)?.[1] || '0'
                  return parseInt(aWeek, 10) - parseInt(bWeek, 10)
                })
                
                const handleWeekChange = (newWeek: number) => {
                  const targetWorkout = relatedWorkouts.find(w => {
                    const wWeek = w.title.match(/Semana (\d+)/i)?.[1]
                    return wWeek && parseInt(wWeek, 10) === newWeek
                  })
                  if (targetWorkout) {
                    setSelectedWorkoutId(targetWorkout.id)
                  }
                }
                
                return (
                  <WorkoutExcelTable 
                    workout={displayedWorkout}
                    onUpdate={loadWorkouts}
                    activeTrainerSlug={displayedWorkout.trainer_slug as 'edu' | 'carolina' | undefined}
                    weekNumber={weekNumber}
                    onWeekChange={handleWeekChange}
                  />
                )
              })()}
            </div>
          )}
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </DashboardLayout>
  )
}
