'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Save, Edit2, Trash2, Download, AlertTriangle, X, Flame, TrendingUp, Zap, ChevronRight, ChevronLeft, Calendar, Info } from 'lucide-react'
import { useToast } from './Toast'
import * as XLSX from 'xlsx'

type Workout = {
  id: string
  title: string
  description?: string
  workout_data?: any
  trainer_slug?: string
}

type Exercise = {
  name: string
  day: string
  sets: number
  reps: string
  tempo?: string
  rest_seconds?: number
  muscle_groups?: string[]
  notes?: string
}

type ExerciseLog = {
  id: string
  workout_id?: string
  exercise_name: string
  date: string
  sets: Array<{
    set_number: number
    reps?: number
    weight_kg?: number
    tempo?: string
    rest_seconds?: number
    notes?: string
  }>
  notes?: string
}

type WorkoutExcelTableProps = {
  workout: Workout
  onUpdate: () => void
  activeTrainerSlug?: 'edu' | 'carolina' | 'jey' | string | null
  /** Related workout IDs (same program, e.g. old "Semana X") - logs are merged for one table */
  relatedWorkoutIds?: string[]
  weekNumber?: number
  onWeekChange?: (weekNumber: number) => void
  /** Coach mode: trainer editing on behalf of student. Uses coach-write API. */
  coachMode?: boolean
  studentId?: string
}

type Warning = {
  type: 'removed_exercise' | 'removed_muscle' | 'imbalanced_split'
  message: string
  severity: 'low' | 'medium' | 'high'
}

const MAX_SESSIONS = 20

function EditExerciseForm({ exercise, onSave, onCancel }: { exercise: Exercise; onSave: (ex: Exercise) => void; onCancel: () => void }) {
  const [name, setName] = useState(exercise.name)
  const [sets, setSets] = useState(String(exercise.sets))
  const [reps, setReps] = useState(exercise.reps)
  const [tempo, setTempo] = useState(exercise.tempo || '')
  const [restSeconds, setRestSeconds] = useState(String(exercise.rest_seconds ?? 90))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const setsNum = parseInt(sets, 10)
    const restNum = parseInt(restSeconds, 10)
    onSave({
      ...exercise,
      name: name.trim() || exercise.name,
      sets: isNaN(setsNum) || setsNum < 1 ? 3 : Math.min(setsNum, 10),
      reps: reps.trim() || '8-12',
      tempo: tempo.trim() || undefined,
      rest_seconds: isNaN(restNum) || restNum < 0 ? 90 : Math.min(restNum, 300),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-[#A7AFBE] mb-1">Nombre</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-[10px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#A7AFBE] mb-1">Series</label>
          <input
            type="number"
            min={1}
            max={10}
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            className="w-full rounded-[10px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#A7AFBE] mb-1">Reps objetivo</label>
          <input
            type="text"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="8-12"
            className="w-full rounded-[10px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#A7AFBE] mb-1">Tempo</label>
          <input
            type="text"
            value={tempo}
            onChange={(e) => setTempo(e.target.value)}
            placeholder="2-1-1-0"
            className="w-full rounded-[10px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#A7AFBE] mb-1">Descanso (seg)</label>
          <input
            type="number"
            min={0}
            max={300}
            value={restSeconds}
            onChange={(e) => setRestSeconds(e.target.value)}
            className="w-full rounded-[10px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-[10px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] hover:bg-[#24282F] text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 rounded-[10px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] text-sm font-medium"
        >
          Guardar
        </button>
      </div>
    </form>
  )
}

export function WorkoutExcelTable({ workout, onUpdate, activeTrainerSlug, relatedWorkoutIds = [], weekNumber = 1, onWeekChange, coachMode = false, studentId }: WorkoutExcelTableProps) {
  const toast = useToast()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  const todayRowRef = useRef<HTMLTableRowElement>(null)
  const todayColRef = useRef<HTMLTableCellElement>(null)
  const [loading, setLoading] = useState(true)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [showWarnings, setShowWarnings] = useState(false)
  const [infoTooltip, setInfoTooltip] = useState<{ type: 'reps' | 'tempo' | 'rest' | null; x: number; y: number }>({ type: null, x: 0, y: 0 })
  const tableRef = useRef<HTMLTableElement>(null)
  // Fixed session count: NO auto-creation. Only 3 columns (Semana 1, 2, Próx). Increase only via "+" button.
  const [sessionCount, setSessionCount] = useState(3)

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  useEffect(() => {
    loadWorkoutData()
    loadLogs()
  }, [workout.id, relatedWorkoutIds.join(',')])

  // Auto-scroll to rightmost column (próxima sesión) when table loads
  useEffect(() => {
    if (!loading && todayColRef.current) {
      setTimeout(() => {
        todayColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' })
      }, 400)
    }
  }, [loading])

  const loadWorkoutData = () => {
    if (!workout.workout_data) {
      setExercises([])
      setLoading(false)
      return
    }

    const workoutData = workout.workout_data
    const exercisesList: Exercise[] = []

    // Parse workout_data structure
    if (workoutData.days && Array.isArray(workoutData.days)) {
      workoutData.days.forEach((day: any) => {
        if (day.exercises && Array.isArray(day.exercises)) {
          day.exercises.forEach((ex: any) => {
            exercisesList.push({
              name: ex.name || ex.exercise_name || '',
              day: day.day || day.name || '',
              sets: ex.sets || ex.target_sets || 3,
              reps: ex.reps || ex.target_reps || '8-12',
              tempo: ex.tempo || '',
              rest_seconds: ex.rest_seconds || ex.rest || 90,
              muscle_groups: ex.muscle_groups || ex.muscles || [],
              notes: ex.notes || ''
            })
          })
        }
      })
    }

    setExercises(exercisesList)
    setLoading(false)
  }

  const loadLogs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const ids = [workout.id, ...relatedWorkoutIds].filter((id, i, arr) => arr.indexOf(id) === i)
      let url = ids.length > 1
        ? `/api/exercise-logs?workoutIds=${ids.join(',')}`
        : `/api/exercise-logs?workoutId=${workout.id}`
      if (coachMode && studentId) {
        url += (url.includes('?') ? '&' : '?') + `studentId=${studentId}`
      }
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error loading logs:', error)
    }
  }

  const getLogForExercise = (exerciseName: string, date: string): ExerciseLog | undefined => {
    const matches = logs.filter(log => log.exercise_name === exerciseName && log.date === date)
    if (matches.length === 0) return undefined
    if (matches.length === 1) return matches[0]
    return matches.find(m => m.workout_id === workout.id) || matches[0]
  }

  const handleCellBlur = async (
    day: string,
    exercise: string,
    sessionDate: string,
    set: number,
    field: string,
    value: string
  ) => {
    const v = value.trim()
    const log = getLogForExercise(exercise, sessionDate)
    const setData = log?.sets?.find(s => s.set_number === set)
    const curVal = field === 'reps' ? setData?.reps : setData?.weight_kg
    const newVal = v ? (field === 'reps' ? Number(v) : parseFloat(v)) : null
    if (newVal === curVal || (v === '' && (curVal == null || Number.isNaN(curVal)))) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const exerciseData = exercises.find(e => e.name === exercise)
      if (!exerciseData) return

      const date = sessionDate
      const setPayload = {
        set_number: set,
        [field === 'reps' ? 'reps' : 'weight_kg']: v ? Number(v) : null
      } as { set_number: number; reps?: number | null; weight_kg?: number | null }

      if (coachMode && studentId) {
        const response = await fetch('/api/exercise-logs/coach-write', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            student_id: studentId,
            workout_id: workout.id,
            exercise_name: exercise,
            date,
            sets: [setPayload],
          }),
        })
        if (response.ok) {
          await loadLogs()
          toast.success('Datos guardados')
        } else {
          const err = await response.json().catch(() => ({}))
          toast.error(err.error || 'Error al guardar')
        }
        return
      }

      const updatedLog = getLogForExercise(exercise, date)

      if (!updatedLog) {
        const response = await fetch('/api/exercise-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workout_id: workout.id,
            exercise_name: exercise,
            date,
            sets: [setPayload],
            ...(relatedWorkoutIds.length > 0 && { related_workout_ids: relatedWorkoutIds })
          }),
        })

        if (response.ok) {
          await loadLogs()
          toast.success('Datos guardados')
        } else {
          toast.error('Error al guardar')
        }
      } else {
        const sets = [...(updatedLog.sets || [])]
        let setIndex = sets.findIndex(s => s.set_number === set)

        if (setIndex === -1) {
          sets.push({ ...setPayload } as any)
        } else {
          sets[setIndex] = { ...sets[setIndex], ...setPayload } as any
        }

        const response = await fetch(`/api/exercise-logs?id=${updatedLog.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ sets }),
        })

        if (response.ok) {
          await loadLogs()
          toast.success('Datos guardados')
        } else {
          toast.error('Error al guardar')
        }
      }
    } catch (error) {
      console.error('Error saving log:', error)
      toast.error('Error al guardar')
    }
  }

  const handleDeleteExercise = async (exerciseName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${exerciseName}"?`)) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const exercise = exercises.find(e => e.name === exerciseName)
      if (!exercise) return

      // Check for warnings
      const newWarnings: Warning[] = []
      if (exercise.muscle_groups && exercise.muscle_groups.length > 0) {
        const remainingExercises = exercises.filter(e => e.name !== exerciseName)
        const remainingMuscles = new Set<string>()
        remainingExercises.forEach(e => {
          e.muscle_groups?.forEach(m => remainingMuscles.add(m))
        })
        
        exercise.muscle_groups.forEach(muscle => {
          if (!remainingMuscles.has(muscle)) {
            newWarnings.push({
              type: 'removed_muscle',
              message: `Al eliminar "${exerciseName}", el grupo muscular "${muscle}" ya no tendrá ejercicios. Esto puede desequilibrar tu entrenamiento.`,
              severity: 'high'
            })
          }
        })
      }

      if (newWarnings.length > 0) {
        setWarnings(newWarnings)
        setShowWarnings(true)
        return
      }

      // Update workout data
      const workoutData = workout.workout_data || { days: [] }
      const updatedDays = workoutData.days.map((day: any) => ({
        ...day,
        exercises: day.exercises?.filter((ex: any) => ex.name !== exerciseName) || []
      }))

      const response = await fetch('/api/workouts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: workout.id,
          workout_data: { ...workoutData, days: updatedDays },
          ...(coachMode && studentId && { studentId }),
        }),
      })

      if (response.ok) {
        loadWorkoutData()
        onUpdate()
        toast.success('Ejercicio eliminado')
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || 'Error al eliminar')
      }
    } catch (error) {
      console.error('Error deleting exercise:', error)
      toast.error('Error al eliminar ejercicio')
    }
  }

  const handleSaveExercise = async (updated: Exercise) => {
    if (!editingExercise) return
    const oldName = editingExercise.name

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const workoutData = workout.workout_data || { days: [] }
      const updatedDays = workoutData.days.map((day: any) => ({
        ...day,
        exercises: (day.exercises || []).map((ex: any) => {
          const name = ex.name || ex.exercise_name || ''
          if (name !== oldName) return ex
          return {
            ...ex,
            name: updated.name,
            exercise_name: updated.name,
            sets: updated.sets,
            target_sets: updated.sets,
            reps: updated.reps,
            target_reps: updated.reps,
            tempo: updated.tempo || ex.tempo,
            rest_seconds: updated.rest_seconds ?? ex.rest_seconds ?? ex.rest ?? 90,
            rest: updated.rest_seconds ?? ex.rest_seconds ?? ex.rest ?? 90,
          }
        }),
      }))

      const response = await fetch('/api/workouts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: workout.id,
          workout_data: { ...workoutData, days: updatedDays },
          ...(coachMode && studentId && { studentId }),
        }),
      })

      if (response.ok) {
        setEditingExercise(null)
        loadWorkoutData()
        onUpdate()
        toast.success('Ejercicio actualizado')
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || 'Error al guardar')
      }
    } catch (error) {
      console.error('Error saving exercise:', error)
      toast.error('Error al guardar ejercicio')
    }
  }

  const handleExportToExcel = () => {
    if (!tableRef.current) return

    // Get all dates from logs
    const allDates = Array.from(new Set(logs.map(log => log.date))).sort()
    
    // Group exercises by day for export
    const exercisesByDayExport = exercises.reduce((acc, exercise) => {
      if (!acc[exercise.day]) {
        acc[exercise.day] = []
      }
      acc[exercise.day].push(exercise)
      return acc
    }, {} as Record<string, Exercise[]>)
    
    // Get days to show
    const allDaysExport = daysOfWeek.filter(day => exercisesByDayExport[day] && exercisesByDayExport[day].length > 0)
    const uniqueDaysFromExercises = Array.from(new Set(exercises.map(e => e.day))).filter(Boolean)
    const daysToShowExport = allDaysExport.length > 0 ? allDaysExport : uniqueDaysFromExercises
    
    // Create workbook
    const wb = XLSX.utils.book_new()
    
    // Create data array
    const rows: any[] = []
    
    // Header row
    const header = ['Día', 'Ejercicio', 'Series', 'Reps Obj.', 'Tempo', 'Descanso (s)']
    allDates.forEach(date => {
      header.push(new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }))
    })
    rows.push(header)
    
    // Data rows - grouped by day
    daysToShowExport.forEach(day => {
      const dayExercises = exercisesByDayExport[day] || []
      dayExercises.forEach((exercise, idx) => {
        const row: any[] = [
          idx === 0 ? day : '', // Only show day in first row of each day group
          exercise.name,
          exercise.sets,
          exercise.reps,
          exercise.tempo || '-',
          exercise.rest_seconds || '-'
        ]
        
        allDates.forEach(date => {
          const log = getLogForExercise(exercise.name, date)
          if (log && log.sets && log.sets.length > 0) {
            const setsData = log.sets.map(s => `${s.reps || '-'} x ${s.weight_kg || '-'}kg`).join(' | ')
            row.push(setsData)
          } else {
            row.push('-')
          }
        })
        
        rows.push(row)
      })
    })
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(rows)
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Día
      { wch: 25 }, // Ejercicio
      { wch: 8 },  // Series
      { wch: 10 }, // Reps Obj.
      { wch: 12 }, // Tempo
      { wch: 12 }, // Descanso
      ...allDates.map(() => ({ wch: 20 })) // Dates
    ]
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Entrenamiento')
    
    // Save file
    XLSX.writeFile(wb, `${workout.title}_${new Date().toISOString().split('T')[0]}.xlsx`)
    
    toast.success('Entrenamiento exportado a Excel')
  }

  const handleNextWeek = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('No hay sesión activa')
        return
      }

      // Desactivar el workout actual (archivarlo)
      const archiveResponse = await fetch('/api/workouts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: workout.id,
          is_active: false
        }),
      })

      if (!archiveResponse.ok) {
        const errorData = await archiveResponse.json().catch(() => ({}))
        console.error('Error archiving workout:', errorData)
        toast.error('Error al archivar la semana actual')
        return
      }

      // Crear nueva semana con la misma estructura pero sin logs
      const newWeekNumber = weekNumber + 1
      // Si el título ya tiene "Semana X", reemplazarlo, si no, agregarlo
      const baseTitle = workout.title.replace(/\s*-\s*Semana \d+/i, '').trim()
      const newTitle = `${baseTitle} - Semana ${newWeekNumber}`
      
      const newWorkoutResponse = await fetch('/api/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          trainer_slug: workout.trainer_slug || activeTrainerSlug,
          title: newTitle,
          description: workout.description,
          workout_data: workout.workout_data, // Misma estructura, sin logs
          is_active: true
        }),
      })

      if (!newWorkoutResponse.ok) {
        const errorData = await newWorkoutResponse.json().catch(() => ({}))
        console.error('Error creating new workout:', errorData)
        toast.error('Error al crear la nueva semana')
        return
      }

      const newWorkoutData = await newWorkoutResponse.json()
      const newWorkout = newWorkoutData.workout

      if (!newWorkout || !newWorkout.id) {
        console.error('New workout data is invalid:', newWorkoutData)
        toast.error('Error: No se recibió el ID del nuevo entrenamiento')
        return
      }

      toast.success(`Semana ${weekNumber} archivada. Nueva semana ${newWeekNumber} creada.`)
      
      // Refresh workouts list first, then change to new week
      // Call onUpdate and wait a bit for it to complete
      onUpdate()
      
      // Wait for the update to complete, then change to new week
      // We'll try multiple times in case the update takes longer
      let attempts = 0
      const maxAttempts = 10
      const checkAndChange = () => {
        attempts++
        if (onWeekChange) {
          onWeekChange(newWeekNumber)
        }
        // If we haven't reached max attempts, try again after a delay
        // This gives time for the workouts list to refresh
        if (attempts < maxAttempts) {
          setTimeout(checkAndChange, 400)
        }
      }
      
      // Start checking after a short delay to allow the API calls to complete
      setTimeout(checkAndChange, 800)
    } catch (error) {
      console.error('Error moving to next week:', error)
      toast.error('Error al pasar a la siguiente semana')
    }
  }

  const handleExportToCSV = () => {
    // Get all dates from logs
    const allDates = Array.from(new Set(logs.map(log => log.date))).sort()
    
    // Group exercises by day for export
    const exercisesByDayExport = exercises.reduce((acc, exercise) => {
      if (!acc[exercise.day]) {
        acc[exercise.day] = []
      }
      acc[exercise.day].push(exercise)
      return acc
    }, {} as Record<string, Exercise[]>)
    
    // Get days to show
    const allDaysExport = daysOfWeek.filter(day => exercisesByDayExport[day] && exercisesByDayExport[day].length > 0)
    const uniqueDaysFromExercises = Array.from(new Set(exercises.map(e => e.day))).filter(Boolean)
    const daysToShowExport = allDaysExport.length > 0 ? allDaysExport : uniqueDaysFromExercises
    
    // Create CSV rows
    const rows: string[] = []
    
    // Header row
    const header = ['Día', 'Ejercicio', 'Series', 'Reps Obj.', 'Tempo', 'Descanso (s)', ...allDates]
    rows.push(header.map(h => `"${h}"`).join(','))
    
    // Data rows - grouped by day
    daysToShowExport.forEach(day => {
      const dayExercises = exercisesByDayExport[day] || []
      dayExercises.forEach((exercise, idx) => {
        const row: any[] = [
          idx === 0 ? day : '', // Only show day in first row of each day group
          exercise.name,
          exercise.sets,
          exercise.reps,
          exercise.tempo || '-',
          exercise.rest_seconds || '-'
        ]
        
        allDates.forEach(date => {
          const log = getLogForExercise(exercise.name, date)
          if (log && log.sets && log.sets.length > 0) {
            const setsData = log.sets.map(s => `${s.reps || '-'} x ${s.weight_kg || '-'}kg`).join(' | ')
            row.push(setsData)
          } else {
            row.push('-')
          }
        })
        
        rows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      })
    })
    
    // Download CSV
    const csv = '\ufeff' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${workout.title}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Entrenamiento exportado a CSV')
  }

  if (loading) {
    return (
      <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-8">
        <p className="text-[#A7AFBE]">Cargando...</p>
      </div>
    )
  }

  if (exercises.length === 0) {
    return (
      <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-8 text-center">
        <p className="text-[#A7AFBE] mb-4">No hay ejercicios en este entrenamiento</p>
        <p className="text-sm text-[#7B8291]">Habla con tu entrenador para que agregue ejercicios a tu rutina</p>
      </div>
    )
  }

  const todayStr = new Date().toISOString().split('T')[0]

  const getSessionsForExercise = (exerciseName: string): ExerciseLog[] => {
    return logs
      .filter(l => l.exercise_name === exerciseName)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const handleAddSession = () => {
    setSessionCount(prev => Math.min(prev + 1, MAX_SESSIONS))
  }

  const getDateForEmptySession = (sessionIdx: number): string => {
    const d = new Date()
    const offset = sessionIdx - (sessionCount - 1)
    d.setDate(d.getDate() + offset)
    return d.toISOString().split('T')[0]
  }

  // Group exercises by day
  const exercisesByDay = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.day]) {
      acc[exercise.day] = []
    }
    acc[exercise.day].push(exercise)
    return acc
  }, {} as Record<string, Exercise[]>)

  // Get all days in order (only days with exercises)
  // If no days match, show all exercises anyway
  const allDays = daysOfWeek.filter(day => exercisesByDay[day] && exercisesByDay[day].length > 0)
  
  // Fallback: if no days match, show all unique days from exercises
  const uniqueDaysFromExercises = Array.from(new Set(exercises.map(e => e.day))).filter(Boolean)
  const daysToShow = allDays.length > 0 ? allDays : uniqueDaysFromExercises

  // Get today's day name in Spanish
  const getTodayDayName = () => {
    const today = new Date()
    const dayIndex = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    // Convert to Spanish format: Monday = 1 -> Lunes, Sunday = 0 -> Domingo
    const spanishDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return spanishDays[dayIndex]
  }

  // Normalize day names for comparison (remove accents, lowercase, trim)
  const normalizeDayName = (day: string) => {
    return day
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
  }

  const abbreviateDay = (day: string) => {
    const m: Record<string, string> = {
      lunes: 'Lun', martes: 'Mar', miércoles: 'Mié', miercoles: 'Mié', jueves: 'Jue',
      viernes: 'Vie', sábado: 'Sáb', sabado: 'Sáb', domingo: 'Dom'
    }
    const firstWord = day.toLowerCase().trim().split(/[\s-]/)[0] || ''
    return m[firstWord] || day.slice(0, 3)
  }

  const todayDayName = getTodayDayName()
  const normalizedTodayDayName = normalizeDayName(todayDayName)
  
  // Check if any day name contains today's day name (e.g., "Martes - Pull" contains "Martes")
  const isTodayWorkoutDay = Object.keys(exercisesByDay).some(day => {
    const normalizedDay = normalizeDayName(day)
    return normalizedDay.includes(normalizedTodayDayName) || normalizedTodayDayName.includes(normalizedDay)
  })
  
  const isTodayRestDay = !isTodayWorkoutDay && daysOfWeek.includes(todayDayName)
  
  // Helper function to find the best record for an exercise (highest weight, then highest reps, then first)
  const getBestRecord = (exerciseName: string): { date: string; set: number; weight: number; reps: number } | null => {
    const exerciseLogs = logs.filter(log => log.exercise_name === exerciseName)
    if (exerciseLogs.length === 0) return null

    let bestRecord: { date: string; set: number; weight: number; reps: number } | null = null

    exerciseLogs.forEach(log => {
      log.sets?.forEach(set => {
        const weight = set.weight_kg || 0
        const reps = set.reps || 0
        
        if (weight === 0 && reps === 0) return // Skip empty sets
        
        if (!bestRecord) {
          bestRecord = { date: log.date, set: set.set_number, weight, reps }
        } else {
          // Compare: weight first, then reps, then keep first if equal
          if (weight > bestRecord.weight) {
            bestRecord = { date: log.date, set: set.set_number, weight, reps }
          } else if (weight === bestRecord.weight && weight > 0) {
            if (reps > bestRecord.reps) {
              bestRecord = { date: log.date, set: set.set_number, weight, reps }
            }
            // If weight and reps are equal, keep the first one (already set)
          }
        }
      })
    })

    return bestRecord
  }

  return (
    <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[16px] sm:rounded-[22px] p-4 sm:p-6 space-y-4 overflow-hidden">
      {/* Info Tooltip */}
      {infoTooltip.type && (
        <>
          <div 
            className="fixed inset-0 z-50" 
            onClick={() => setInfoTooltip({ type: null, x: 0, y: 0 })}
          />
          <div
            className="fixed z-50 bg-[#1A1D24] border-2 border-[#FF2D2D]/40 rounded-[12px] p-4 shadow-2xl max-w-sm"
            style={{
              left: `${infoTooltip.x}px`,
              top: `${infoTooltip.y}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-[8px] bg-[#FF2D2D]/20 flex-shrink-0">
                <Info className="w-4 h-4 text-[#FF2D2D]" />
              </div>
              <div className="flex-1">
                <h4 className="font-heading text-sm font-bold text-[#F8FAFC] mb-2">
                  {infoTooltip.type === 'reps' && 'Reps Obj.'}
                  {infoTooltip.type === 'tempo' && 'Tempo'}
                  {infoTooltip.type === 'rest' && 'Descanso'}
                </h4>
                <p className="text-xs text-[#A7AFBE] leading-relaxed">
                  {infoTooltip.type === 'reps' && (
                    <>
                      Es el objetivo de repeticiones a hacer en <strong className="text-[#F8FAFC]">todas las series</strong> de un ejercicio para considerarse un buen momento para subir de peso. Es importante que intentes ir subiendo progresivamente y cuando cumplas en todas las series con el objetivo de reps, debes subir al siguiente peso.
                    </>
                  )}
                  {infoTooltip.type === 'tempo' && (
                    <>
                      Es el tiempo en segundos que debes dedicar a cada movimiento de cada ejercicio. Por ejemplo, <strong className="text-[#F8FAFC]">2-1-1-0</strong> significa: 2 segundos bajando, 1 segundo manteniendo abajo, 1 segundo subiendo, y 0 segundos manteniendo arriba.
                    </>
                  )}
                  {infoTooltip.type === 'rest' && (
                    <>
                      Es el tiempo de descanso entre series. Es <strong className="text-[#F8FAFC]">muy importante</strong> descansar el músculo lo suficiente entre ejercicio y ejercicio para permitir la recuperación adecuada y poder rendir al máximo en cada serie.
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => setInfoTooltip({ type: null, x: 0, y: 0 })}
                className="p-1 rounded hover:bg-[#24282F] transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-[#A7AFBE]" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit Exercise Modal */}
      {editingExercise && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setEditingExercise(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-[#14161B] border-2 border-[#FF2D2D]/40 rounded-[16px] p-6 w-full max-w-md shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-heading text-lg font-bold text-[#F8FAFC] mb-4">Editar ejercicio</h3>
              <EditExerciseForm
                exercise={editingExercise}
                onSave={(ex) => handleSaveExercise(ex)}
                onCancel={() => setEditingExercise(null)}
              />
            </div>
          </div>
        </>
      )}

      {/* Rest Day Message - compact on mobile (1 line + expand), full on desktop */}
      {isTodayRestDay && (
        <>
          <div className="sm:hidden bg-gradient-to-r from-[#3B82F6]/20 to-[#3B82F6]/10 border-2 border-[#3B82F6]/40 rounded-[12px] p-3 mb-4">
            <details className="group">
              <summary className="flex items-center gap-2 cursor-pointer list-none">
                <div className="p-1.5 rounded-[10px] bg-[#3B82F6]/20 flex-shrink-0">
                  <Calendar className="w-4 h-4 text-[#3B82F6]" />
                </div>
                <h4 className="font-heading text-sm font-bold text-[#F8FAFC] flex-1">Hoy: descanso</h4>
                <ChevronRight className="w-4 h-4 text-[#A7AFBE] group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-xs text-[#A7AFBE] mt-2 pl-11">
                Aprovecha para recuperarte, descansar bien y volver más fuerte mañana. El descanso es parte del entrenamiento. 💪
              </p>
            </details>
          </div>
          <div className="hidden sm:block bg-gradient-to-r from-[#3B82F6]/20 to-[#3B82F6]/10 border-2 border-[#3B82F6]/40 rounded-[16px] p-5 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-[12px] bg-[#3B82F6]/20">
                <Calendar className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <div className="flex-1">
                <h4 className="font-heading text-lg font-bold text-[#F8FAFC] mb-1">¡Hoy es tu día de descanso!</h4>
                <p className="text-sm text-[#A7AFBE]">
                  Aprovecha para recuperarte, descansar bien y volver más fuerte mañana. El descanso es parte del entrenamiento. 💪
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Warnings */}
      {showWarnings && warnings.length > 0 && (
        <div className="bg-[#FBBF24]/10 border border-[#FBBF24]/30 rounded-[12px] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#FBBF24]" />
              <h4 className="font-semibold text-[#F8FAFC]">Advertencias</h4>
            </div>
            <button
              onClick={() => setShowWarnings(false)}
              className="p-1 rounded-lg hover:bg-[#1A1D24] transition-colors"
            >
              <X className="w-4 h-4 text-[#A7AFBE]" />
            </button>
          </div>
          {warnings.map((warning, idx) => (
            <p key={idx} className="text-sm text-[#F8FAFC]">{warning.message}</p>
          ))}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                setShowWarnings(false)
                setWarnings([])
              }}
              className="px-4 py-2 rounded-lg bg-[#1A1D24] text-[#F8FAFC] hover:bg-[#24282F] transition-colors text-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[12px] bg-gradient-to-br from-[#FF2D2D]/20 to-[#FF2D2D]/10 border border-[#FF2D2D]/30">
            <TrendingUp className="w-5 h-5 text-[#FF2D2D]" />
          </div>
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
              Seguimiento de Progreso
              <Flame className="w-4 h-4 text-[#FF2D2D]" />
            </h3>
            <p className="text-xs text-[#7B8291] mt-0.5">Registra tus entrenamientos y supera tus límites</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportToExcel}
            className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-[10px] bg-gradient-to-r from-[#FF2D2D]/20 to-[#FF2D2D]/10 border border-[#FF2D2D]/30 text-[#F8FAFC] hover:from-[#FF2D2D]/30 hover:to-[#FF2D2D]/20 hover:border-[#FF2D2D]/50 transition-all text-sm font-medium shadow-lg shadow-[#FF2D2D]/10 touch-manipulation"
            title="Exportar a Excel"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleExportToCSV}
            className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-[10px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] hover:bg-[#24282F] hover:border-[#FF2D2D]/30 transition-all text-sm font-medium touch-manipulation"
            title="Exportar a CSV"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Excel-like Table - scroll-x-touch enables proper horizontal scroll on iOS */}
      <div className="scroll-x-touch -mx-2 sm:-mx-4 px-2 sm:px-4 rounded-xl">
        <table ref={tableRef} className="w-full border-collapse text-sm" style={{ minWidth: `${340 + sessionCount * 72}px` }}>
          <thead>
            <tr className="border-b-2 border-[#FF2D2D]/30 bg-gradient-to-r from-[#1A1D24] via-[#1A1D24] to-[#1A1D24]">
              <th className="text-center p-0.5 sm:p-1 text-[10px] sm:text-xs md:text-sm font-medium text-[#7B8291] sticky left-0 bg-[#1A1D24] z-20 w-[20px] sm:w-[26px] md:w-[34px] min-w-[20px] sm:min-w-[26px] md:min-w-[34px] max-w-[26px] md:max-w-[34px] uppercase tracking-wider shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(-180deg)' }}>
                <span className="inline-block whitespace-nowrap py-1 text-[9px] sm:text-[10px] md:text-xs font-semibold">Día</span>
              </th>
              <th className="text-left p-1 sm:p-3 text-xs sm:text-sm font-bold text-[#F8FAFC] sticky left-[20px] sm:left-[26px] md:left-[34px] bg-[#1A1D24] z-20 w-[100px] sm:w-[140px] min-w-[100px] sm:min-w-[140px] max-w-[140px] sm:max-w-[180px] uppercase tracking-wider shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-[#FF2D2D] inline mr-1" />
                <span className="hidden sm:inline">Ejercicio</span>
                <span className="sm:hidden">Ej.</span>
              </th>
              <th className="text-center p-1.5 sm:p-3 text-[10px] sm:text-xs font-bold text-[#F8FAFC] min-w-[44px] sm:min-w-[60px] uppercase tracking-wider">Series</th>
              <th className="text-center p-1.5 sm:p-3 text-[10px] sm:text-xs font-bold text-[#F8FAFC] min-w-[48px] sm:min-w-[70px] uppercase tracking-wider" scope="col">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                  <span className="hidden sm:inline">Reps Obj.</span>
                  <span className="sm:hidden">Reps</span>
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setInfoTooltip({ type: 'reps', x: rect.left + rect.width / 2, y: rect.bottom + 8 })
                    }}
                    className="p-0.5 rounded hover:bg-[#1A1D24] transition-colors group"
                    title="Información sobre Reps Obj."
                  >
                    <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#7B8291] group-hover:text-[#FF2D2D] transition-colors" />
                  </button>
                </div>
              </th>
              <th className="text-center p-1.5 sm:p-3 text-[10px] sm:text-xs font-bold text-[#F8FAFC] min-w-[48px] sm:min-w-[70px] uppercase tracking-wider">
                <div className="flex items-center justify-center gap-0.5 sm:gap-1.5">
                  Tempo
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setInfoTooltip({ type: 'tempo', x: rect.left + rect.width / 2, y: rect.bottom + 8 })
                    }}
                    className="p-0.5 rounded hover:bg-[#1A1D24] transition-colors group"
                    title="Información sobre Tempo"
                  >
                    <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#7B8291] group-hover:text-[#FF2D2D] transition-colors" />
                  </button>
                </div>
              </th>
              <th className="text-center p-1.5 sm:p-3 text-[10px] sm:text-xs font-bold text-[#F8FAFC] min-w-[48px] sm:min-w-[70px] uppercase tracking-wider">
                <div className="flex items-center justify-center gap-0.5 sm:gap-1.5">
                  <span className="hidden sm:inline">Descanso</span>
                  <span className="sm:hidden">Desc.</span>
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setInfoTooltip({ type: 'rest', x: rect.left + rect.width / 2, y: rect.bottom + 8 })
                    }}
                    className="p-0.5 rounded hover:bg-[#1A1D24] transition-colors group"
                    title="Información sobre Descanso"
                  >
                    <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#7B8291] group-hover:text-[#FF2D2D] transition-colors" />
                  </button>
                </div>
              </th>
              {/* Columnas por sesión: Semana 1, 2, 3... scroll horizontal para más */}
              {Array.from({ length: sessionCount }).map((_, idx) => {
                const isLast = idx === sessionCount - 1
                return (
                  <th
                    key={idx}
                    ref={isLast ? todayColRef : undefined}
                    className={`text-center p-1 sm:p-2 text-[10px] sm:text-xs font-bold min-w-[72px] sm:min-w-[100px] w-[72px] sm:w-auto uppercase tracking-wider border-l border-[rgba(255,255,255,0.05)] ${
                      isLast ? 'text-[#FF2D2D] bg-[#FF2D2D]/10' : 'text-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div>{isLast ? 'Próx.' : (<><span className="hidden sm:inline">Semana {idx + 1}</span><span className="sm:hidden">Sem {idx + 1}</span></>)}</div>
                      {isLast && sessionCount < MAX_SESSIONS && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddSession() }}
                          className="flex items-center justify-center w-7 h-7 rounded-lg border-2 border-[#FF2D2D]/50 bg-[#1A1D24] hover:bg-[#FF2D2D]/20 hover:border-[#FF2D2D] transition-colors touch-manipulation mt-1"
                          title="Añadir siguiente semana"
                          aria-label="Añadir siguiente semana"
                        >
                          <Plus className="w-4 h-4 text-[#FF2D2D]" />
                        </button>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {daysToShow.map((day) => {
              const dayExercises = exercisesByDay[day] || []
              return dayExercises.map((exercise, exerciseIdx) => {
                const isFirstExerciseOfDay = exerciseIdx === 0
                const isLastExerciseOfDay = exerciseIdx === dayExercises.length - 1
                const rowSpan = dayExercises.length
                // Check if day name contains today's day name (e.g., "Martes - Pull" contains "Martes")
                const normalizedDay = normalizeDayName(day)
                const isToday = normalizedDay.includes(normalizedTodayDayName) || normalizedTodayDayName.includes(normalizedDay)
                
                // Get log for today's date (selectedDate)
                const bestRecord = getBestRecord(exercise.name)
                
                return (
                  <tr 
                    key={`${day}-${exercise.name}-${exerciseIdx}`} 
                    ref={isToday && isFirstExerciseOfDay ? todayRowRef : undefined}
                    className={`border-b transition-all group relative ${
                      isLastExerciseOfDay ? 'border-b-2 border-b-[#FF2D2D]/25' : 'border-b border-[rgba(255,255,255,0.05)]'
                    } ${
                      isToday 
                        ? 'bg-gradient-to-r from-[#FF2D2D]/15 to-[#FF2D2D]/5 border-l-4 border-l-[#FF2D2D] hover:from-[#FF2D2D]/20 hover:to-[#FF2D2D]/10' 
                        : 'hover:bg-gradient-to-r hover:from-[#1A1D24]/80 hover:to-[#1A1D24]/40'
                    }`}
                  >
                    {isFirstExerciseOfDay && (
                      <td 
                        rowSpan={rowSpan} 
                        className={`p-0.5 sm:p-1 text-[9px] sm:text-[10px] md:text-xs font-bold sticky left-0 z-20 align-middle border-r-2 transition-all w-[20px] sm:w-[26px] md:w-[34px] min-w-[20px] sm:min-w-[26px] md:min-w-[34px] max-w-[26px] md:max-w-[34px] ${
                          isToday
                            ? 'bg-gradient-to-b from-[#FF2D2D]/20 to-[#FF2D2D]/10 border-r-[#FF2D2D]/40 text-[#F8FAFC]'
                            : 'bg-gradient-to-b from-[#14161B] to-[#0F1115] border-[#FF2D2D]/20 text-[#F8FAFC]'
                        }`}
                        title={day}
                      >
                        <div className="flex flex-col items-center justify-center min-h-[40px]" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(-180deg)' }}>
                          <span className={`inline-block whitespace-nowrap py-1 font-heading ${isToday ? 'text-[#FF2D2D] font-extrabold' : ''}`}>
                            {day}{isToday && ' (Hoy)'}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="p-1 sm:p-3 text-xs sm:text-sm font-semibold text-[#F8FAFC] sticky left-[20px] sm:left-[26px] md:left-[34px] bg-[#14161B] z-20 w-[100px] sm:w-[140px] min-w-[100px] sm:min-w-[140px] max-w-[160px] sm:max-w-[180px] group-hover:bg-[#1A1D24]/50 transition-colors shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]" title={exercise.name}>
                      <div className="flex items-center justify-between gap-1 sm:gap-2">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <div className="w-0.5 sm:w-1 h-3 sm:h-5 rounded-full bg-gradient-to-b from-[#FF2D2D] to-[#FF2D2D]/50 flex-shrink-0"></div>
                          <span className="font-medium text-[11px] sm:text-sm break-words line-clamp-2 sm:line-clamp-1">{exercise.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingExercise(exercise)}
                            className="p-1 sm:p-1.5 rounded-[6px] hover:bg-[#24282F] hover:border border-[#FF2D2D]/30 transition-all touch-manipulation"
                            title="Editar ejercicio"
                          >
                            <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#A7AFBE] hover:text-[#FF2D2D] transition-colors" />
                          </button>
                          <button
                            onClick={() => handleDeleteExercise(exercise.name)}
                            className="p-1 sm:p-1.5 rounded-[6px] hover:bg-[#24282F] hover:border border-[#EF4444]/30 transition-all touch-manipulation"
                            title="Eliminar ejercicio"
                          >
                            <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#EF4444]" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="p-1 sm:p-2 text-xs text-center">
                      <span className="inline-flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-[6px] bg-gradient-to-br from-[#FF2D2D]/20 to-[#FF2D2D]/10 border border-[#FF2D2D]/30 text-[#F8FAFC] font-bold text-[10px] sm:text-xs">
                        {exercise.sets}
                      </span>
                    </td>
                    <td className="p-1 sm:p-2 text-xs text-center">
                      <span className="inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 rounded-[6px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] font-medium text-[10px] sm:text-xs">
                        {exercise.reps}
                      </span>
                    </td>
                    <td className="p-1 sm:p-2 text-[10px] sm:text-xs text-center text-[#A7AFBE] font-medium">{exercise.tempo || '-'}</td>
                    <td className="p-1 sm:p-2 text-center">
                      <span className="inline-flex items-center justify-center px-1 sm:px-1.5 py-0.5 rounded-[6px] bg-[#1A1D24] text-[#A7AFBE] text-[9px] sm:text-xs font-medium">
                        {exercise.rest_seconds || '-'}s
                      </span>
                    </td>
                    {/* Columnas por sesión: Semana 1, 2, 3... Siempre editables, sin gaps */}
                    {Array.from({ length: sessionCount }).map((_, sessionIdx) => {
                      const sessions = getSessionsForExercise(exercise.name)
                      const log = sessions[sessionIdx]
                      const isNextColumn = sessionIdx === sessionCount - 1
                      const sessionDate = log?.date ?? (isNextColumn ? todayStr : getDateForEmptySession(sessionIdx))

                      return (
                        <td
                          key={sessionIdx}
                          className={`relative z-10 p-0.5 sm:p-1.5 border-l border-[rgba(255,255,255,0.03)] min-w-[72px] w-[72px] sm:min-w-[100px] sm:w-auto ${
                            isNextColumn ? 'bg-[#FF2D2D]/5' : ''
                          }`}
                        >
                          <div className="flex flex-col gap-0.5 sm:gap-1">
                            {Array.from({ length: exercise.sets }).map((_, setIdx) => {
                              const set = setIdx + 1
                              const setData = log?.sets?.find(s => s.set_number === set)
                              const hasSetData = setData && (setData.reps || setData.weight_kg)
                              const isBestRecord = bestRecord && 
                                                  bestRecord.date === sessionDate && 
                                                  bestRecord.set === set &&
                                                  setData?.weight_kg === bestRecord.weight &&
                                                  setData?.reps === bestRecord.reps

                              return (
                                <div 
                                  key={set} 
                                  className={`flex gap-0.5 sm:gap-1 items-center justify-center rounded py-0.5 ${isBestRecord ? 'bg-[#FF2D2D]/12' : ''}`}
                                  title={isBestRecord ? 'PR' : undefined}
                                >
                                  <input
                                    key={`reps-${day}-${exercise.name}-${sessionDate}-${set}-${setData?.reps ?? 'e'}`}
                                    type="text"
                                    inputMode="numeric"
                                    defaultValue={setData?.reps != null ? String(setData.reps) : ''}
                                    onBlur={(e) => handleCellBlur(day, exercise.name, sessionDate, set, 'reps', e.target.value)}
                                    placeholder="R"
                                    className={`min-w-[28px] w-7 sm:min-w-[36px] sm:w-10 px-0.5 sm:px-1 py-0.5 rounded text-center text-[#F8FAFC] text-base sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] focus:border-transparent touch-manipulation border ${
                                      hasSetData ? 'bg-[#FF2D2D]/20 border-[#FF2D2D]/40' : 'bg-[#1A1D24] border-[rgba(255,255,255,0.08)] hover:border-[#FF2D2D]/30'
                                    }`}
                                  />
                                  <span className="text-[#7B8291] font-bold text-[9px] sm:text-[10px] flex-shrink-0">×</span>
                                  <input
                                    key={`weight-${day}-${exercise.name}-${sessionDate}-${set}-${setData?.weight_kg ?? 'e'}`}
                                    type="text"
                                    inputMode="decimal"
                                    defaultValue={setData?.weight_kg != null ? String(setData.weight_kg) : ''}
                                    onBlur={(e) => handleCellBlur(day, exercise.name, sessionDate, set, 'weight', e.target.value)}
                                    placeholder="kg"
                                    className={`min-w-[28px] w-8 sm:min-w-[36px] sm:w-12 px-0.5 sm:px-1 py-0.5 rounded text-center text-[#F8FAFC] text-base sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] focus:border-transparent touch-manipulation border ${
                                      hasSetData ? 'bg-[#FF2D2D]/20 border-[#FF2D2D]/40' : 'bg-[#1A1D24] border-[rgba(255,255,255,0.08)] hover:border-[#FF2D2D]/30'
                                    }`}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-4">
        <div className="p-4 rounded-[12px] bg-gradient-to-r from-[#FF2D2D]/10 via-[#FF2D2D]/5 to-transparent border border-[#FF2D2D]/20">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-[8px] bg-[#FF2D2D]/20 border border-[#FF2D2D]/30">
              <Zap className="w-4 h-4 text-[#FF2D2D]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#F8FAFC] mb-1">¡Registra tu progreso!</p>
              <p className="text-xs text-[#A7AFBE]">
                Haz clic en las celdas para registrar reps y pesos. Se guarda automáticamente.
              </p>
            </div>
          </div>
        </div>

        {/* Opción para crear nuevo historial (solo cuando el usuario lo decida) */}
        <details className="group">
          <summary className="flex items-center justify-center gap-2 px-4 py-2 rounded-[12px] text-sm text-[#7B8291] hover:text-[#A7AFBE] cursor-pointer list-none">
            <span className="group-open:rotate-90 transition-transform">▶</span>
            Crear nuevo historial (empezar tabla desde cero)
          </summary>
          <div className="mt-3 p-4 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)]">
            <p className="text-xs text-[#A7AFBE] mb-3">
              Esta tabla se extiende automáticamente. Solo usa esta opción si quieres archivar el progreso actual y empezar una nueva tabla limpia.
            </p>
            <button
              onClick={handleNextWeek}
              className="flex items-center justify-center gap-2 px-4 py-2 min-h-[40px] rounded-[10px] bg-[#24282F] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] hover:bg-[#2d3239] text-sm touch-manipulation"
            >
              <Plus className="w-4 h-4" />
              Crear nueva tabla y archivar actual
            </button>
          </div>
        </details>
      </div>
    </div>
  )
}

