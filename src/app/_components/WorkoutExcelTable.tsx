'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Save, Edit2, Trash2, Download, AlertTriangle, X, Trophy, Flame, Target, TrendingUp, Zap, ChevronRight, ChevronLeft, Calendar, Info } from 'lucide-react'
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
  activeTrainerSlug?: 'edu' | 'carolina' | null
  weekNumber?: number
  onWeekChange?: (weekNumber: number) => void
}

type Warning = {
  type: 'removed_exercise' | 'removed_muscle' | 'imbalanced_split'
  message: string
  severity: 'low' | 'medium' | 'high'
}

export function WorkoutExcelTable({ workout, onUpdate, activeTrainerSlug, weekNumber = 1, onWeekChange }: WorkoutExcelTableProps) {
  const toast = useToast()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  // Always use today's date for logging
  const selectedDate = new Date().toISOString().split('T')[0]
  const todayRowRef = useRef<HTMLTableRowElement>(null)
  const [editingCell, setEditingCell] = useState<{ exercise: string; date: string; set: number; field: string } | null>(null)
  const [cellValue, setCellValue] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [showWarnings, setShowWarnings] = useState(false)
  const [infoTooltip, setInfoTooltip] = useState<{ type: 'reps' | 'tempo' | 'rest' | null; x: number; y: number }>({ type: null, x: 0, y: 0 })
  const tableRef = useRef<HTMLTableElement>(null)

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  useEffect(() => {
    loadWorkoutData()
    loadLogs()
  }, [workout.id])

  // Auto-scroll to today's day when table loads
  useEffect(() => {
    if (todayRowRef.current && !loading) {
      setTimeout(() => {
        todayRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [loading, exercises])

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

      const response = await fetch(`/api/exercise-logs?workoutId=${workout.id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error loading logs:', error)
    }
  }

  const getLogForExercise = (exerciseName: string, date: string) => {
    return logs.find(log => log.exercise_name === exerciseName && log.date === date)
  }

  const handleCellClick = (exercise: string, date: string, set: number, field: string) => {
    const log = getLogForExercise(exercise, date)
    const setData = log?.sets?.find(s => s.set_number === set)
    
    let value = ''
    if (field === 'reps') value = setData?.reps?.toString() || ''
    if (field === 'weight') value = setData?.weight_kg?.toString() || ''

    setEditingCell({ exercise, date, set, field })
    setCellValue(value)
  }

  const handleCellSave = async () => {
    if (!editingCell) return

    const { exercise, date, set, field } = editingCell
    const value = cellValue.trim()
    
    // Clear editing state immediately to prevent UI bugs
    const currentEditingCell = editingCell
    setEditingCell(null)
    setCellValue('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const exerciseData = exercises.find(e => e.name === exercise)
      if (!exerciseData) return

      let updatedLog = getLogForExercise(exercise, date)
      
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
            sets: [{
              set_number: set,
              [field === 'reps' ? 'reps' : 'weight_kg']: value ? Number(value) : null
            }]
          }),
        })

        if (response.ok) {
          await loadLogs()
          toast.success('Datos guardados')
        } else {
          // Restore editing state on error
          setEditingCell(currentEditingCell)
          setCellValue(value)
          toast.error('Error al guardar')
        }
      } else {
        const sets = [...(updatedLog.sets || [])]
        let setIndex = sets.findIndex(s => s.set_number === set)
        
        if (setIndex === -1) {
          sets.push({
            set_number: set,
            [field === 'reps' ? 'reps' : 'weight_kg']: value ? Number(value) : null
          } as any)
        } else {
          sets[setIndex] = {
            ...sets[setIndex],
            [field === 'reps' ? 'reps' : 'weight_kg']: value ? Number(value) : null
          }
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
          // Restore editing state on error
          setEditingCell(currentEditingCell)
          setCellValue(value)
          toast.error('Error al guardar')
        }
      }
    } catch (error) {
      console.error('Error saving log:', error)
      // Restore editing state on error
      setEditingCell(currentEditingCell)
      setCellValue(value)
      toast.error('Error al guardar')
    }
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setCellValue('')
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

      const response = await fetch(`/api/workouts?id=${workout.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          workout_data: { ...workoutData, days: updatedDays }
        }),
      })

      if (response.ok) {
        onUpdate()
        toast.success('Ejercicio eliminado')
      }
    } catch (error) {
      console.error('Error deleting exercise:', error)
      toast.error('Error al eliminar ejercicio')
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

  // Use only selectedDate (today) for logging - no need for multiple date columns
  // The table will show days of the week, and user scrolls to today's day

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

  const todayDayName = getTodayDayName()
  const normalizedTodayDayName = normalizeDayName(todayDayName)
  
  // Check if any day name contains today's day name (e.g., "Martes - Pull" contains "Martes")
  const isTodayWorkoutDay = Object.keys(exercisesByDay).some(day => {
    const normalizedDay = normalizeDayName(day)
    return normalizedDay.includes(normalizedTodayDayName) || normalizedTodayDayName.includes(normalizedDay)
  })
  
  const isTodayRestDay = !isTodayWorkoutDay && daysOfWeek.includes(todayDayName)
  
  // Debug log (remove in production if needed)
  console.log('Day detection:', {
    todayDayName,
    normalizedTodayDayName,
    exercisesByDayKeys: Object.keys(exercisesByDay),
    normalizedExercisesByDayKeys: Object.keys(exercisesByDay).map(day => normalizeDayName(day)),
    isTodayWorkoutDay,
    isTodayRestDay
  })

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
    <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6 space-y-4">
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

      {/* Rest Day Message */}
      {isTodayRestDay && (
        <div className="bg-gradient-to-r from-[#3B82F6]/20 to-[#3B82F6]/10 border-2 border-[#3B82F6]/40 rounded-[16px] p-5 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[12px] bg-[#3B82F6]/20">
              <Calendar className="w-6 h-6 text-[#3B82F6]" />
            </div>
            <div className="flex-1">
              <h4 className="font-heading text-lg font-bold text-[#F8FAFC] mb-1">
                ¡Hoy es tu día de descanso!
              </h4>
              <p className="text-sm text-[#A7AFBE]">
                Aprovecha para recuperarte, descansar bien y volver más fuerte mañana. El descanso es parte del entrenamiento. 💪
              </p>
            </div>
          </div>
        </div>
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[12px] bg-gradient-to-br from-[#FF2D2D]/20 to-[#FF2D2D]/10 border border-[#FF2D2D]/30">
            <TrendingUp className="w-5 h-5 text-[#FF2D2D]" />
          </div>
          <div>
            <h3 className="font-heading text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
              Seguimiento de Progreso
              <Flame className="w-4 h-4 text-[#FF2D2D]" />
            </h3>
            <p className="text-xs text-[#7B8291] mt-0.5">Registra tus entrenamientos y supera tus límites</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-gradient-to-r from-[#FF2D2D]/20 to-[#FF2D2D]/10 border border-[#FF2D2D]/30 text-[#F8FAFC] hover:from-[#FF2D2D]/30 hover:to-[#FF2D2D]/20 hover:border-[#FF2D2D]/50 transition-all text-sm font-medium shadow-lg shadow-[#FF2D2D]/10"
            title="Exportar a Excel"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleExportToCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] hover:bg-[#24282F] hover:border-[#FF2D2D]/30 transition-all text-sm font-medium"
            title="Exportar a CSV"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Excel-like Table */}
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[#FF2D2D]/30 bg-gradient-to-r from-[#1A1D24] via-[#1A1D24] to-[#1A1D24]">
              <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-medium text-[#7B8291] sticky left-0 bg-[#1A1D24] z-10 min-w-[60px] sm:min-w-[80px] uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#7B8291]" />
                  <span className="hidden sm:inline">Día</span>
                </div>
              </th>
              <th className="text-left p-3 sm:p-4 text-sm font-bold text-[#F8FAFC] sticky left-[60px] sm:left-[80px] bg-[#1A1D24] z-10 min-w-[180px] sm:min-w-[200px] uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#FF2D2D]" />
                  Ejercicio
                </div>
              </th>
              <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-bold text-[#F8FAFC] min-w-[70px] sm:min-w-[80px] uppercase tracking-wider">Series</th>
              <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-bold text-[#F8FAFC] min-w-[90px] sm:min-w-[100px] uppercase tracking-wider">
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
              <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-bold text-[#F8FAFC] min-w-[80px] sm:min-w-[100px] uppercase tracking-wider">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5">
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
              <th className="text-center p-3 sm:p-4 text-xs sm:text-sm font-bold text-[#F8FAFC] min-w-[80px] sm:min-w-[100px] uppercase tracking-wider">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5">
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
              {/* Columns for each series - dynamically based on max sets */}
              {Array.from({ length: Math.max(...exercises.map(e => e.sets), 4) }).map((_, seriesIdx) => {
                const seriesNum = seriesIdx + 1
                return (
                  <th key={seriesNum} className="text-center p-1.5 sm:p-2 text-xs font-bold text-[#F8FAFC] min-w-[110px] sm:min-w-[140px] uppercase tracking-wider border-l border-[rgba(255,255,255,0.05)]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] sm:text-[10px]">S{seriesNum}</span>
                      <div className="flex gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] font-normal text-[#7B8291]">
                        <span>R</span>
                        <span>×</span>
                        <span>P</span>
                      </div>
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
                const rowSpan = dayExercises.length
                // Check if day name contains today's day name (e.g., "Martes - Pull" contains "Martes")
                const normalizedDay = normalizeDayName(day)
                const isToday = normalizedDay.includes(normalizedTodayDayName) || normalizedTodayDayName.includes(normalizedDay)
                
                // Get log for today's date (selectedDate)
                const log = getLogForExercise(exercise.name, selectedDate)
                const bestRecord = getBestRecord(exercise.name)
                
                return (
                  <tr 
                    key={`${day}-${exercise.name}-${exerciseIdx}`} 
                    ref={isToday && isFirstExerciseOfDay ? todayRowRef : undefined}
                    className={`border-b transition-all group relative ${
                      isToday 
                        ? 'bg-gradient-to-r from-[#FF2D2D]/15 to-[#FF2D2D]/5 border-l-4 border-l-[#FF2D2D] hover:from-[#FF2D2D]/20 hover:to-[#FF2D2D]/10' 
                        : 'border-[rgba(255,255,255,0.05)] hover:bg-gradient-to-r hover:from-[#1A1D24]/80 hover:to-[#1A1D24]/40'
                    }`}
                  >
                    {isFirstExerciseOfDay && (
                      <td 
                        rowSpan={rowSpan} 
                        className={`p-4 text-sm font-bold sticky left-0 z-10 align-top border-r-2 transition-all ${
                          isToday
                            ? 'bg-gradient-to-b from-[#FF2D2D]/20 to-[#FF2D2D]/10 border-r-[#FF2D2D]/40 text-[#F8FAFC]'
                            : 'bg-gradient-to-b from-[#14161B] to-[#0F1115] border-[#FF2D2D]/20 text-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-[#FF2D2D] animate-pulse' : 'bg-[#FF2D2D] animate-pulse'}`}></div>
                          <span className={`font-heading text-base ${isToday ? 'text-[#FF2D2D] font-extrabold' : ''}`}>
                            {day}
                            {isToday && <span className="ml-2 text-xs text-[#FF2D2D]/70">(HOY)</span>}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="p-4 text-sm font-semibold text-[#F8FAFC] sticky left-[120px] bg-[#14161B] z-10 group-hover:bg-[#1A1D24]/50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#FF2D2D] to-[#FF2D2D]/50"></div>
                          <span className="font-medium">{exercise.name}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingExercise(exercise)}
                            className="p-1.5 rounded-[6px] hover:bg-[#24282F] hover:border border-[#FF2D2D]/30 transition-all"
                            title="Editar ejercicio"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#A7AFBE] hover:text-[#FF2D2D] transition-colors" />
                          </button>
                          <button
                            onClick={() => handleDeleteExercise(exercise.name)}
                            className="p-1.5 rounded-[6px] hover:bg-[#24282F] hover:border border-[#EF4444]/30 transition-all"
                            title="Eliminar ejercicio"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[#EF4444]" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] bg-gradient-to-br from-[#FF2D2D]/20 to-[#FF2D2D]/10 border border-[#FF2D2D]/30 text-[#F8FAFC] font-bold">
                        {exercise.sets}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-[8px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] font-medium">
                        {exercise.reps}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-center text-[#A7AFBE] font-medium">{exercise.tempo || '-'}</td>
                    <td className="p-4 text-sm text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-[6px] bg-[#1A1D24] text-[#A7AFBE] text-xs font-medium">
                        {exercise.rest_seconds || '-'}s
                      </span>
                    </td>
                    {/* Columns for each series */}
                    {Array.from({ length: exercise.sets }).map((_, setIdx) => {
                      const set = setIdx + 1
                      const setData = log?.sets?.find(s => s.set_number === set)
                      const isEditing = editingCell?.exercise === exercise.name && 
                                      editingCell?.date === selectedDate && 
                                      editingCell?.set === set
                      const hasSetData = setData && (setData.reps || setData.weight_kg)
                      const isBestRecord = bestRecord && 
                                          bestRecord.date === selectedDate && 
                                          bestRecord.set === set &&
                                          setData?.weight_kg === bestRecord.weight &&
                                          setData?.reps === bestRecord.reps

                      return (
                        <td key={set} className="p-1 sm:p-1.5 border-l border-[rgba(255,255,255,0.03)]">
                          <div className="flex gap-0.5 sm:gap-1 items-center justify-center">
                            <div className="flex flex-col gap-0.5">
                              {isEditing && editingCell?.field === 'reps' ? (
                                <input
                                  type="number"
                                  value={cellValue}
                                  onChange={(e) => setCellValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCellSave()
                                    if (e.key === 'Escape') handleCellCancel()
                                  }}
                                  autoFocus
                                  className="w-11 sm:w-12 px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-[4px] sm:rounded-[5px] bg-[#1A1D24] border-2 border-[#FF2D2D] text-[#F8FAFC] text-[11px] sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]/50"
                                  placeholder="R"
                                />
                              ) : (
                                <div
                                  onClick={() => handleCellClick(exercise.name, selectedDate, set, 'reps')}
                                  className={`w-11 sm:w-12 px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-[4px] sm:rounded-[5px] text-[#F8FAFC] cursor-pointer text-center border transition-colors text-[11px] sm:text-xs font-semibold ${
                                    hasSetData 
                                      ? 'bg-gradient-to-br from-[#FF2D2D]/20 to-[#FF2D2D]/10 border-[#FF2D2D]/40 hover:from-[#FF2D2D]/30 hover:to-[#FF2D2D]/20 hover:border-[#FF2D2D]/60' 
                                      : 'bg-[#1A1D24] border-transparent hover:bg-[#24282F] hover:border-[#FF2D2D]/30'
                                  }`}
                                  title="Clic para editar reps"
                                >
                                  {setData?.reps || '-'}
                                </div>
                              )}
                            </div>
                            <span className="text-[#7B8291] font-bold text-[10px] sm:text-xs">×</span>
                            <div className="flex flex-col gap-0.5">
                              {isEditing && editingCell?.field === 'weight' ? (
                                <input
                                  type="number"
                                  step="0.5"
                                  value={cellValue}
                                  onChange={(e) => setCellValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCellSave()
                                    if (e.key === 'Escape') handleCellCancel()
                                  }}
                                  autoFocus
                                  className="w-14 sm:w-16 px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-[4px] sm:rounded-[5px] bg-[#1A1D24] border-2 border-[#FF2D2D] text-[#F8FAFC] text-[11px] sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]/50"
                                  placeholder="P"
                                />
                              ) : (
                                <div
                                  onClick={() => handleCellClick(exercise.name, selectedDate, set, 'weight')}
                                  className={`w-14 sm:w-16 px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-[4px] sm:rounded-[5px] text-[#F8FAFC] cursor-pointer text-center border transition-colors text-[11px] sm:text-xs font-semibold ${
                                    hasSetData 
                                      ? 'bg-gradient-to-br from-[#FF2D2D]/20 to-[#FF2D2D]/10 border-[#FF2D2D]/40 hover:from-[#FF2D2D]/30 hover:to-[#FF2D2D]/20 hover:border-[#FF2D2D]/60' 
                                      : 'bg-[#1A1D24] border-transparent hover:bg-[#24282F] hover:border-[#FF2D2D]/30'
                                  }`}
                                  title="Clic para editar peso"
                                >
                                  {setData?.weight_kg ? `${setData.weight_kg}kg` : '-'}
                                </div>
                              )}
                            </div>
                            {isBestRecord && (
                              <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#FF2D2D] ml-0.5" />
                            )}
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
              <p className="text-xs text-[#A7AFBE]">Haz clic en las celdas para registrar tus reps y pesos. Los cambios se guardan automáticamente.</p>
            </div>
          </div>
        </div>

        {/* Botón para añadir nueva semana */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleNextWeek}
            className="flex items-center gap-2 px-6 py-3 rounded-[12px] bg-gradient-to-r from-[#FF2D2D] to-[#FF4444] text-[#F8FAFC] hover:from-[#FF4444] hover:to-[#FF5555] transition-all text-sm font-semibold shadow-lg shadow-[#FF2D2D]/20 hover:shadow-[#FF2D2D]/30"
          >
            <Plus className="w-4 h-4" />
            Completar Semana y Añadir Nueva
          </button>
          <p className="text-xs text-[#7B8291] text-center max-w-md">
            Al completar esta semana, se guardará automáticamente en el historial y se creará una nueva semana con el mismo entrenamiento pero con reps y pesos vacíos para que puedas empezar de nuevo.
          </p>
        </div>
      </div>
    </div>
  )
}

