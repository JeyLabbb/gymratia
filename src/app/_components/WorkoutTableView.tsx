'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Save, Edit2, Trash2 } from 'lucide-react'
import { useToast } from './Toast'

type Workout = {
  id: string
  title: string
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

type WorkoutTableViewProps = {
  workout: Workout
  onUpdate: () => void
}

export function WorkoutTableView({ workout, onUpdate }: WorkoutTableViewProps) {
  const toast = useToast()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [editingCell, setEditingCell] = useState<{ exercise: string; date: string; set: number; field: string } | null>(null)
  const [cellValue, setCellValue] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorkoutData()
    loadLogs()
  }, [workout.id, selectedDate])

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
    if (field === 'tempo') value = setData?.tempo || ''
    if (field === 'rest') value = setData?.rest_seconds?.toString() || ''
    if (field === 'notes') value = setData?.notes || ''

    setEditingCell({ exercise, date, set, field })
    setCellValue(value)
  }

  const detectUnusualChange = (exercise: Exercise, field: string, newValue: string, oldValue: any, exerciseDate: string, setNum: number) => {
    // Get historical logs for this exercise and set
    const previousLogs = logs
      .filter(l => l.exercise_name === exercise.name && new Date(l.date) < new Date(exerciseDate))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10) // Get last 10 sessions for pattern analysis

    if (previousLogs.length === 0) {
      // No history, can't detect patterns
      return null
    }

    // Extract values for this specific set from history
    const historicalValues = previousLogs
      .map(log => {
        const setData = log.sets?.find(s => s.set_number === setNum)
        return setData ? {
          date: log.date,
          reps: setData.reps,
          weight: setData.weight_kg
        } : null
      })
      .filter(Boolean) as Array<{ date: string; reps?: number; weight?: number }>

    if (historicalValues.length === 0) {
      return null
    }

    // Check for stagnation (same values repeated)
    if (historicalValues.length >= 4) {
      const last4 = historicalValues.slice(0, 4)
      const allSameReps = last4.every(v => v.reps === last4[0].reps && v.reps !== undefined)
      const allSameWeight = last4.every(v => v.weight === last4[0].weight && v.weight !== undefined)
      
      if (allSameReps && allSameWeight && field === 'reps') {
        const newReps = parseInt(newValue)
        if (!isNaN(newReps) && newReps === last4[0].reps) {
          return {
            type: 'stagnation',
            message: `Estancamiento detectado en ${exercise.name}: 5 entrenamientos seguidos con ${newReps} reps x ${last4[0].weight}kg`,
            exercise: exercise.name,
            value: newReps,
            previous: last4[0].reps,
            weight: last4[0].weight,
            sessions: 5
          }
        }
      }
    }

    if (field === 'reps' && newValue) {
      const newReps = parseInt(newValue)
      if (isNaN(newReps)) return null

      // Get last session values
      const lastSession = historicalValues[0]
      if (!lastSession || lastSession.reps === undefined) return null

      const lastReps = lastSession.reps
      const lastWeight = lastSession.weight || 0

      // Get current weight from the log being edited
      const currentLog = getLogForExercise(exercise.name, exerciseDate)
      const currentSet = currentLog?.sets?.find(s => s.set_number === setNum)
      const currentWeight = currentSet?.weight_kg || lastWeight

      // Detect drastic changes in pattern (not just drops, but impossible improvements)
      // Case 1: Massive improvement that's physically unlikely
      // e.g., 5 reps with 10kg → 20 reps with 15kg (impossible)
      if (newReps > lastReps * 2 && currentWeight >= lastWeight * 0.9) {
        // More than double reps with same or higher weight is suspicious
        return {
          type: 'drastic_improvement',
          message: `Mejora drástica en ${exercise.name}: ${newReps} reps x ${currentWeight}kg (antes: ${lastReps} reps x ${lastWeight}kg)`,
          exercise: exercise.name,
          value: newReps,
          previous: lastReps,
          weight: currentWeight,
          previousWeight: lastWeight
        }
      }

      // Case 2: Massive drop that's unusual (more than 50% drop)
      if (newReps < lastReps * 0.5 && currentWeight <= lastWeight * 1.1) {
        // Less than half reps with same or lower weight is concerning
        return {
          type: 'drastic_drop',
          message: `Bajada drástica en ${exercise.name}: ${newReps} reps x ${currentWeight}kg (antes: ${lastReps} reps x ${lastWeight}kg)`,
          exercise: exercise.name,
          value: newReps,
          previous: lastReps,
          weight: currentWeight,
          previousWeight: lastWeight
        }
      }

      // Case 3: Reps increased significantly but weight also increased significantly
      // This is unusual - normally when weight goes up, reps go down
      if (newReps > lastReps * 1.3 && currentWeight > lastWeight * 1.1) {
        return {
          type: 'unusual_pattern',
          message: `Patrón inusual en ${exercise.name}: ${newReps} reps x ${currentWeight}kg (antes: ${lastReps} reps x ${lastWeight}kg) - subiste peso Y reps`,
          exercise: exercise.name,
          value: newReps,
          previous: lastReps,
          weight: currentWeight,
          previousWeight: lastWeight
        }
      }
    }

    if (field === 'weight' && newValue) {
      const newWeight = parseFloat(newValue)
      if (isNaN(newWeight)) return null

      const lastSession = historicalValues[0]
      if (!lastSession || lastSession.weight === undefined) return null

      const lastWeight = lastSession.weight
      const lastReps = lastSession.reps || 0

      // Get current reps from the log being edited
      const currentLog = getLogForExercise(exercise.name, exerciseDate)
      const currentSet = currentLog?.sets?.find(s => s.set_number === setNum)
      const currentReps = currentSet?.reps || lastReps

      // Detect drastic weight changes
      // Case 1: Massive weight increase with same or higher reps (unusual)
      if (newWeight > lastWeight * 1.3 && currentReps >= lastReps * 0.9) {
        return {
          type: 'drastic_weight_increase',
          message: `Aumento drástico de peso en ${exercise.name}: ${newWeight}kg x ${currentReps} reps (antes: ${lastWeight}kg x ${lastReps} reps)`,
          exercise: exercise.name,
          value: newWeight,
          previous: lastWeight,
          reps: currentReps,
          previousReps: lastReps
        }
      }

      // Case 2: Massive weight drop (more than 30%)
      if (newWeight < lastWeight * 0.7) {
        return {
          type: 'drastic_weight_drop',
          message: `Bajada drástica de peso en ${exercise.name}: ${newWeight}kg x ${currentReps} reps (antes: ${lastWeight}kg x ${lastReps} reps)`,
          exercise: exercise.name,
          value: newWeight,
          previous: lastWeight,
          reps: currentReps,
          previousReps: lastReps
        }
      }
    }

    return null
  }

  const handleCellSave = async () => {
    if (!editingCell) return

    const { exercise, date, set, field } = editingCell
    const value = cellValue.trim()

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get exercise data for this exercise
      const exerciseData = exercises.find(e => e.name === exercise)
      if (!exerciseData) return

      // Detect unusual changes
      const log = getLogForExercise(exercise, date)
      const setData = log?.sets?.find(s => s.set_number === set)
      const oldValue = field === 'reps' ? setData?.reps : field === 'weight' ? setData?.weight_kg : null
      
      const unusualChange = detectUnusualChange(exerciseData, field, value, oldValue, date, set)

      // Get or create log for this exercise and date
      let updatedLog = getLogForExercise(exercise, date)
      
      if (!log) {
        // Create new log
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
              [field === 'reps' ? 'reps' : field === 'weight' ? 'weight_kg' : field === 'tempo' ? 'tempo' : field === 'rest' ? 'rest_seconds' : 'notes']: field === 'reps' || field === 'weight' || field === 'rest' ? (value ? Number(value) : null) : value
            }]
          }),
        })

        if (response.ok) {
          await loadLogs()
          toast.showToast('Datos guardados', 'success')

          // If unusual change detected, notify trainer
          if (unusualChange && workout.trainer_slug) {
            await notifyTrainer(unusualChange, exercise, date, set, field, value, session.access_token)
          }
        }
      } else {
        // Update existing log
        const sets = [...(log.sets || [])]
        let setIndex = sets.findIndex(s => s.set_number === set)
        
        if (setIndex === -1) {
          sets.push({
            set_number: set,
            [field === 'reps' ? 'reps' : field === 'weight' ? 'weight_kg' : field === 'tempo' ? 'tempo' : field === 'rest' ? 'rest_seconds' : 'notes']: field === 'reps' || field === 'weight' || field === 'rest' ? (value ? Number(value) : null) : value
          } as any)
        } else {
          sets[setIndex] = {
            ...sets[setIndex],
            [field === 'reps' ? 'reps' : field === 'weight' ? 'weight_kg' : field === 'tempo' ? 'tempo' : field === 'rest' ? 'rest_seconds' : 'notes']: field === 'reps' || field === 'weight' || field === 'rest' ? (value ? Number(value) : null) : value
          }
        }

        const response = await fetch(`/api/exercise-logs?id=${log.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sets
          }),
        })

        if (response.ok) {
          await loadLogs()
          toast.showToast('Datos guardados', 'success')

          // If unusual change detected, notify trainer
          if (unusualChange && workout.trainer_slug) {
            await notifyTrainer(unusualChange, exercise, date, set, field, value, session.access_token)
          }
        }
      }

      setEditingCell(null)
      setCellValue('')
    } catch (error) {
      console.error('Error saving log:', error)
      toast.showToast('Error al guardar', 'error')
    }
  }

  const notifyTrainer = async (
    unusualChange: any,
    exercise: string,
    date: string,
    set: number,
    field: string,
    value: string,
    token: string
  ) => {
    try {
      const trainerSlug = workout.trainer_slug
      if (!trainerSlug) return

      // Send notification to trainer
      await fetch('/api/trainer-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          trainer_slug: trainerSlug,
          message: unusualChange.message,
          type: 'workout_anomaly',
          metadata: {
            exercise: unusualChange.exercise,
            date,
            set,
            field,
            value: unusualChange.value,
            previous: unusualChange.previous,
            weight: unusualChange.weight,
            previousWeight: unusualChange.previousWeight
          }
        }),
      })

      // Trigger automatic trainer message (non-intrusive, only for significant issues)
      // Only trigger for: stagnation, drastic drops, or unusual patterns
      const shouldTriggerMessage = [
        'stagnation',
        'drastic_drop',
        'drastic_improvement',
        'unusual_pattern',
        'drastic_weight_drop'
      ].includes(unusualChange.type)

      if (shouldTriggerMessage) {
        // Trigger trainer message
        await fetch('/api/chat/auto-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            trainer_slug: trainerSlug,
            trigger: 'unusual_workout_change',
            context: {
              exercise: unusualChange.exercise,
              date,
              set,
              type: unusualChange.type,
              message: unusualChange.message,
              value: unusualChange.value,
              previous: unusualChange.previous,
              weight: unusualChange.weight,
              previousWeight: unusualChange.previousWeight,
              reps: unusualChange.reps,
              previousReps: unusualChange.previousReps,
              sessions: unusualChange.sessions
            }
          }),
        })
      }
    } catch (error) {
      console.error('Error notifying trainer:', error)
      // Don't fail the save if notification fails
    }
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setCellValue('')
  }

  // Get unique dates from logs
  const dates = Array.from(new Set(logs.map(log => log.date))).sort().reverse().slice(0, 14) // Last 14 days
  if (!dates.includes(selectedDate)) {
    dates.unshift(selectedDate)
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

  return (
    <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Seguimiento de Progreso</h3>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-[8px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.08)]">
              <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-medium text-[#A7AFBE] sticky left-0 bg-[#14161B] z-10 min-w-[80px] sm:min-w-[120px] max-w-[100px] sm:max-w-[150px]">
                Ejercicio
              </th>
              <th className="text-left p-1 sm:p-2 text-[10px] sm:text-xs font-medium text-[#A7AFBE] min-w-[40px] sm:min-w-[50px] max-w-[50px] sm:max-w-[60px]">Día</th>
              <th className="text-center p-2 sm:p-3 text-xs sm:text-sm font-medium text-[#A7AFBE] min-w-[40px] sm:min-w-[50px]">Series</th>
              <th className="text-center p-2 sm:p-3 text-xs sm:text-sm font-medium text-[#A7AFBE] min-w-[50px] sm:min-w-[60px]">Reps Obj.</th>
              <th className="text-center p-2 sm:p-3 text-xs sm:text-sm font-medium text-[#A7AFBE] min-w-[40px] sm:min-w-[50px]">Tempo</th>
              {dates.map(date => (
                <th key={date} className="text-center p-2 sm:p-3 text-xs sm:text-sm font-medium text-[#A7AFBE] min-w-[100px] sm:min-w-[120px]">
                  {new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exercises.map((exercise, idx) => {
              const maxSets = Math.max(exercise.sets, ...dates.map(date => {
                const log = getLogForExercise(exercise.name, date)
                return log?.sets?.length || 0
              }))
              
              return (
                <tr key={`${exercise.name}-${idx}`} className="border-b border-[rgba(255,255,255,0.05)]">
                  <td className="p-2 sm:p-3 text-[10px] sm:text-xs font-medium text-[#F8FAFC] sticky left-0 bg-[#14161B] z-10 min-w-[80px] sm:min-w-[120px] max-w-[100px] sm:max-w-[150px]">
                    <span className="truncate block" title={exercise.name}>{exercise.name}</span>
                  </td>
                  <td className="p-1 sm:p-1.5 text-[9px] sm:text-[10px] text-[#A7AFBE] min-w-[40px] sm:min-w-[50px] max-w-[50px] sm:max-w-[60px]">
                    <span className="truncate block">{exercise.day.split(' ')[0]}</span>
                  </td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-center text-[#A7AFBE] min-w-[50px] sm:min-w-[60px]">
                    {exercise.sets}
                  </td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-center text-[#A7AFBE] min-w-[60px] sm:min-w-[70px]">
                    {exercise.reps}
                  </td>
                  <td className="p-2 sm:p-3 text-xs sm:text-sm text-center text-[#A7AFBE] min-w-[50px] sm:min-w-[60px]">
                    {exercise.tempo || '-'}
                  </td>
                  {dates.map(date => {
                    const log = getLogForExercise(exercise.name, date)
                    return (
                      <td key={date} className="p-2">
                        <div className="flex flex-col gap-1">
                          {Array.from({ length: maxSets }).map((_, setIdx) => {
                            const set = setIdx + 1
                            const setData = log?.sets?.find(s => s.set_number === set)
                            const isEditing = editingCell?.exercise === exercise.name && 
                                            editingCell?.date === date && 
                                            editingCell?.set === set

                            return (
                              <div key={set} className="flex gap-1 text-xs">
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
                                    className="w-12 px-1 py-0.5 rounded bg-[#1A1D24] border border-[#FF2D2D] text-[#F8FAFC]"
                                  />
                                ) : (
                                  <div
                                    onClick={() => handleCellClick(exercise.name, date, set, 'reps')}
                                    className="w-12 px-1 py-0.5 rounded bg-[#1A1D24] text-[#F8FAFC] cursor-pointer hover:bg-[#24282F] text-center"
                                  >
                                    {setData?.reps || '-'}
                                  </div>
                                )}
                                {isEditing && editingCell?.field === 'weight' ? (
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
                                    className="w-12 px-1 py-0.5 rounded bg-[#1A1D24] border border-[#FF2D2D] text-[#F8FAFC]"
                                  />
                                ) : (
                                  <div
                                    onClick={() => handleCellClick(exercise.name, date, set, 'weight')}
                                    className="w-12 px-1 py-0.5 rounded bg-[#1A1D24] text-[#F8FAFC] cursor-pointer hover:bg-[#24282F] text-center"
                                  >
                                    {setData?.weight_kg || '-'}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-[#7B8291]">
        <p>💡 Haz clic en las celdas para registrar tus reps y pesos. Los cambios se guardan automáticamente.</p>
      </div>
    </div>
  )
}
