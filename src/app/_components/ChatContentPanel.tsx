'use client'

import { ReactNode, useEffect, useState } from 'react'
import { X, UtensilsCrossed, Dumbbell } from 'lucide-react'
import { DietView } from './DietView'
import { MealPlanCalendar } from './MealPlanCalendar'
import { ProgressGraphView } from './ProgressGraphView'
import { ProgressPhotosView } from './ProgressPhotosView'
import { WeightGraphView } from './WeightGraphView'
import { WorkoutExcelTable } from './WorkoutExcelTable'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

type ChatContentType = 'diet' | 'workout' | 'graph' | 'meal_planner' | 'progress_photos' | 'weight_graph' | null

type ChatContentPanelProps = {
  isOpen: boolean
  contentType: ChatContentType
  contentData?: any
  onClose: () => void
  onEdit?: () => void
  title?: string
  activeTrainerSlug?: 'edu' | 'carolina' | 'jey' | string
}

export function ChatContentPanel({ 
  isOpen, 
  contentType, 
  contentData,
  onClose,
  onEdit,
  title,
  activeTrainerSlug
}: ChatContentPanelProps) {
  const { user } = useAuth()
  const [loadedMealPlan, setLoadedMealPlan] = useState<any[]>([])
  const [loadedPhotos, setLoadedPhotos] = useState<any[]>([])
  const [loadedWeightEntries, setLoadedWeightEntries] = useState<any[]>([])
  const [loadedProfile, setLoadedProfile] = useState<{ target_weight_kg?: number } | null>(null)
  const [loadedWorkout, setLoadedWorkout] = useState<any>(null)
  const [workoutLoading, setWorkoutLoading] = useState(false)

  // Load meal planners from database when meal_planner panel opens
  // This ensures we always have all existing days before merging with new contentData
  useEffect(() => {
    if (isOpen && contentType === 'meal_planner' && user && activeTrainerSlug) {
      const loadMealPlanners = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return

          // Load a wider range (past week to next 2 weeks) to ensure we have all days
          const pastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          
          const response = await fetch(`/api/meal-planner?startDate=${pastWeek}&endDate=${nextTwoWeeks}&trainerSlug=${activeTrainerSlug}`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            const planners = data.planners || []
            // Convert meal planners to MealPlanCalendar format
            const mealPlanData = planners.map((p: any) => ({
              date: p.date,
              meals: p.meals || [],
              workoutTime: p.workout_time,
              workoutType: p.workout_type
            }))
            setLoadedMealPlan(mealPlanData)
            console.log('✅ Loaded', mealPlanData.length, 'meal plan days from database')
          }
        } catch (error) {
          console.error('Error loading meal planners:', error)
        }
      }

      loadMealPlanners()
    } else if (isOpen && contentType === 'progress_photos' && user) {
      // Load progress photos
      const loadPhotos = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return

          const response = await fetch('/api/progress-photos', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            setLoadedPhotos(data.photos || [])
          }
        } catch (error) {
          console.error('Error loading photos:', error)
        }
      }

      loadPhotos()
    } else if (isOpen && contentType === 'weight_graph' && user) {
      // Load weight entries and profile (for target weight)
      const loadWeightData = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return

          const [progressRes, profileRes] = await Promise.all([
            fetch('/api/progress', { headers: { Authorization: `Bearer ${session.access_token}` } }),
            fetch('/api/user/profile', { headers: { Authorization: `Bearer ${session.access_token}` } }),
          ])

          if (progressRes.ok) {
            const data = await progressRes.json()
            setLoadedWeightEntries(data.progress || [])
          }
          if (profileRes.ok) {
            const data = await profileRes.json()
            setLoadedProfile(data.profile || null)
          }
        } catch (error) {
          console.error('Error loading weight data:', error)
        }
      }

      loadWeightData()
    } else if (isOpen && contentType === 'workout' && user && activeTrainerSlug) {
      // Load active workout
      const loadWorkout = async () => {
        setWorkoutLoading(true)
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            setWorkoutLoading(false)
            return
          }

          const response = await fetch(`/api/workouts?trainerSlug=${activeTrainerSlug}`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            const workouts = data.workouts || []
            const active = workouts.find((w: any) => w.is_active) || workouts[0] || null
            setLoadedWorkout(active)
          }
        } catch (error) {
          console.error('Error loading workout:', error)
        } finally {
          setWorkoutLoading(false)
        }
      }

      loadWorkout()
    }
  }, [isOpen, contentType, user, activeTrainerSlug])
  
  // Also reload when contentData changes (when agent creates a new meal plan)
  // Only reload if panel is open to avoid unnecessary updates when closing
  useEffect(() => {
    if (!isOpen) return // Don't reload if panel is closed
    
    if (contentType === 'meal_planner' && user && activeTrainerSlug && contentData) {
      const reloadMealPlanners = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return

          // Reload to ensure we have the latest data after a new meal plan is created
          const pastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          
          console.log('🔧 Reloading meal planners after contentData change:', {
            contentDataDates: Array.isArray(contentData) 
              ? contentData.map((d: any) => d.date)
              : contentData.date ? [contentData.date] : 'no date',
            dateRange: { pastWeek, nextTwoWeeks }
          })
          
          const response = await fetch(`/api/meal-planner?startDate=${pastWeek}&endDate=${nextTwoWeeks}&trainerSlug=${activeTrainerSlug}`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            const planners = data.planners || []
            const mealPlanData = planners.map((p: any) => ({
              date: p.date,
              meals: p.meals || [],
              workoutTime: p.workout_time,
              workoutType: p.workout_type
            }))
            
            console.log('🔧 Reloaded meal planners from database:', {
              count: mealPlanData.length,
              dates: mealPlanData.map((d: any) => d.date),
              previousLoadedCount: loadedMealPlan.length,
              previousDates: loadedMealPlan.map((d: any) => d.date)
            })
            
            // CRITICAL: Always update with all days from database
            // The merge logic in renderContent will handle combining with contentData
            setLoadedMealPlan(mealPlanData)
          }
        } catch (error) {
          console.error('❌ Error reloading meal planners:', error)
        }
      }

      // Small delay to ensure the database has been updated
      const timeoutId = setTimeout(() => {
        reloadMealPlanners()
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [contentData, isOpen, contentType, user, activeTrainerSlug])

  if (!isOpen || !contentType) return null

  const getTitle = () => {
    if (title) return title
    // For diet, use the diet title if available, otherwise default
    if (contentType === 'diet' && contentData?.title) {
      return contentData.title
    }
    switch (contentType) {
      case 'diet':
        return 'Dieta'
      case 'workout':
        return 'Entrenamiento'
      case 'graph':
        return 'Progreso'
      case 'meal_planner':
        return 'Plan de Comidas'
      case 'progress_photos':
        return 'Fotos de Progreso'
      case 'weight_graph':
        return 'Evolución del Peso'
      default:
        return 'Contenido'
    }
  }

  const renderContent = () => {
    if (!contentData) {
      // Empty state - waiting for trainer to create content
      if (contentType === 'diet') {
        return (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <UtensilsCrossed className="w-16 h-16 text-[#FF2D2D]/30 mb-4" />
            <h4 className="font-heading text-lg font-bold text-[#F8FAFC] mb-2">
              Esperando tu dieta
            </h4>
            <p className="text-sm text-[#A7AFBE] max-w-md">
              Habla con tu entrenador arriba para que cree tu dieta personalizada. Aparecerá aquí automáticamente cuando la genere.
            </p>
          </div>
        )
      }
      if (contentType === 'workout') {
        return (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Dumbbell className="w-16 h-16 text-[#FF2D2D]/30 mb-4" />
            <h4 className="font-heading text-lg font-bold text-[#F8FAFC] mb-2">
              Esperando tu entrenamiento
            </h4>
            <p className="text-sm text-[#A7AFBE] max-w-md">
              Habla con tu entrenador arriba para que cree tu rutina personalizada. Aparecerá aquí automáticamente cuando la genere.
            </p>
          </div>
        )
      }
      return (
        <div className="flex items-center justify-center h-full text-[#A7AFBE]">
          <p>Cargando contenido...</p>
        </div>
      )
    }

    switch (contentType) {
      case 'diet':
        return <DietView dietData={contentData} onEdit={onEdit} editable={!!onEdit} hideTitle={!!contentData?.title} />
      case 'meal_planner':
        // Convert contentData to MealPlanCalendar format and merge with existing meal plans
        // contentData can be:
        // 1. A single day planner (old format): { date, meals, ... }
        // 2. An array of days (new format): [{ date, meals, ... }, ...]
        // 3. An object with meal_plan array: { meal_plan: [...] }
        // 4. Empty/null - use loadedMealPlan from database
        let mealPlanData: any[] = []
        
        // Start with loaded meal plans from database (all existing days)
        // CRITICAL: Always use loadedMealPlan as the base to preserve all existing days
        const existingMealPlans = loadedMealPlan.length > 0 ? [...loadedMealPlan] : []
        
        console.log('🔧 MEAL PLAN RENDER:', {
          loadedMealPlanCount: loadedMealPlan.length,
          loadedMealPlanDates: loadedMealPlan.map((d: any) => d.date),
          hasContentData: !!contentData,
          contentDataType: Array.isArray(contentData) ? 'array' : typeof contentData,
          existingMealPlansCount: existingMealPlans.length
        })
        
        if (contentData) {
          let newDayData: any[] = []
          
          if (Array.isArray(contentData)) {
            newDayData = contentData
          } else if (contentData?.meal_plan && Array.isArray(contentData.meal_plan)) {
            newDayData = contentData.meal_plan
          } else if (contentData?.date) {
            // Single day planner - convert to array format
            newDayData = [contentData]
          } else if (contentData?.meals && Array.isArray(contentData.meals)) {
            // If contentData has meals but no date, try to use selectedDate or today
            const date = contentData.selectedDate || new Date().toISOString().split('T')[0]
            newDayData = [{ date, meals: contentData.meals }]
          }
          
          // Merge new day data with existing meal plans
          // If a day already exists, update it; otherwise, add it
          // CRITICAL: Always preserve all existing days, only update/add the new ones
          mealPlanData = [...existingMealPlans]
          
          console.log('🔧 MEAL PLAN MERGE:', {
            existingDaysCount: existingMealPlans.length,
            existingDates: existingMealPlans.map((d: any) => d.date),
            newDaysCount: newDayData.length,
            newDates: newDayData.map((d: any) => d.date)
          })
          
          newDayData.forEach((newDay: any) => {
            if (newDay.date) {
              const existingIndex = mealPlanData.findIndex((d: any) => d.date === newDay.date)
              if (existingIndex >= 0) {
                // Update existing day - preserve other properties but update meals
                console.log(`🔧 Updating existing day ${newDay.date}`, {
                  existingMealsCount: mealPlanData[existingIndex].meals?.length || 0,
                  newMealsCount: newDay.meals?.length || 0
                })
                mealPlanData[existingIndex] = {
                  ...mealPlanData[existingIndex],
                  ...newDay,
                  meals: newDay.meals || mealPlanData[existingIndex].meals || []
                }
              } else {
                // Add new day
                console.log(`🔧 Adding new day ${newDay.date}`)
                mealPlanData.push(newDay)
              }
            }
          })
          
          console.log('🔧 MEAL PLAN MERGE RESULT:', {
            finalDaysCount: mealPlanData.length,
            finalDates: mealPlanData.map((d: any) => d.date)
          })
        } else {
          // No contentData - use loaded meal plan from database
          mealPlanData = existingMealPlans
        }
        
        // Sort by date
        mealPlanData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        return (
          <MealPlanCalendar
            mealPlan={mealPlanData}
            editable={true}
            activeTrainerSlug={activeTrainerSlug === 'edu' || activeTrainerSlug === 'carolina' ? activeTrainerSlug : null}
            onDayClick={(date) => {
              // When a day is clicked, ensure it's selected
              console.log('Day clicked in meal planner:', date)
            }}
            onMealPlanUpdate={async (updatedPlan) => {
              // Save updated meal plan to database
              if (user && activeTrainerSlug) {
                try {
                  const { data: { session } } = await supabase.auth.getSession()
                  if (!session) return

                  // Save each day in the meal plan
                  for (const day of updatedPlan) {
                    const response = await fetch('/api/meal-planner', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({
                        date: day.date,
                        meals: day.meals,
                        trainer_slug: activeTrainerSlug,
                        workout_time: day.workoutTime,
                        workout_type: day.workoutType
                      }),
                    })

                    if (response.ok) {
                      console.log('✅ Meal plan saved for', day.date)
                    }
                  }
                  
                  // Reload all meal planners from database to ensure we have the latest data
                  const pastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  
                  const reloadResponse = await fetch(`/api/meal-planner?startDate=${pastWeek}&endDate=${nextTwoWeeks}&trainerSlug=${activeTrainerSlug}`, {
                    headers: {
                      Authorization: `Bearer ${session.access_token}`,
                    },
                  })

                  if (reloadResponse.ok) {
                    const data = await reloadResponse.json()
                    const planners = data.planners || []
                    const mealPlanData = planners.map((p: any) => ({
                      date: p.date,
                      meals: p.meals || [],
                      workoutTime: p.workout_time,
                      workoutType: p.workout_type
                    }))
                    setLoadedMealPlan(mealPlanData)
                    
                    // Dispatch event to notify other components (like diet page) that meal plan was updated
                    window.dispatchEvent(new CustomEvent('meal-plan-updated'))
                  }
                } catch (error) {
                  console.error('Error saving meal plan:', error)
                }
              }
              // Call onEdit if provided to notify parent of changes
              onEdit?.()
            }}
          />
        )
      case 'graph':
        return (
          <ProgressGraphView
            title={contentData.title || 'Progreso'}
            data={contentData.data || []}
            unit={contentData.unit || ''}
            color={contentData.color || '#FF2D2D'}
            goalValue={contentData.goalValue}
          />
        )
      case 'progress_photos':
        return <ProgressPhotosView photos={contentData?.photos || loadedPhotos || []} onPhotoClick={contentData?.onPhotoClick} />
      case 'weight_graph':
        return (
          <WeightGraphView 
            entries={contentData?.entries || loadedWeightEntries || []} 
            targetWeightKg={contentData?.targetWeightKg ?? loadedProfile?.target_weight_kg}
          />
        )
      case 'workout':
        // Use contentData if provided (from action), otherwise use loadedWorkout
        const workoutToDisplay = contentData || loadedWorkout
        // Show empty state if no workout data (don't show loading, just empty state)
        if (!workoutToDisplay && !workoutLoading) {
          return (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Dumbbell className="w-16 h-16 text-[#FF2D2D]/30 mb-4" />
              <h4 className="font-heading text-lg font-bold text-[#F8FAFC] mb-2">
                Esperando tu entrenamiento
              </h4>
              <p className="text-sm text-[#A7AFBE] max-w-md">
                Habla con tu entrenador arriba para que cree tu rutina personalizada. Aparecerá aquí automáticamente cuando la genere.
              </p>
            </div>
          )
        }
        // Show empty state while loading (not "Cargando contenido...")
        if (!workoutToDisplay && workoutLoading) {
          return (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Dumbbell className="w-16 h-16 text-[#FF2D2D]/30 mb-4" />
              <h4 className="font-heading text-lg font-bold text-[#F8FAFC] mb-2">
                Esperando tu entrenamiento
              </h4>
              <p className="text-sm text-[#A7AFBE] max-w-md">
                Habla con tu entrenador arriba para que cree tu rutina personalizada. Aparecerá aquí automáticamente cuando la genere.
              </p>
            </div>
          )
        }
        return (
          <WorkoutExcelTable 
            workout={workoutToDisplay}
            onUpdate={async () => {
              // Reload workout after update
              if (user && activeTrainerSlug) {
                try {
                  const { data: { session } } = await supabase.auth.getSession()
                  if (session) {
                    const res = await fetch(`/api/workouts?trainerSlug=${activeTrainerSlug}`, {
                      headers: {
                        Authorization: `Bearer ${session.access_token}`,
                      },
                    })
                    const data = await res.json()
                    const workouts = data.workouts || []
                    const active = workouts.find((w: any) => w.is_active) || workouts[0] || null
                    setLoadedWorkout(active)
                  }
                } catch (error) {
                  console.error('Error reloading workout:', error)
                }
              }
            }}
            activeTrainerSlug={activeTrainerSlug || undefined}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className={`border-t border-[rgba(255,255,255,0.08)] bg-[#0A0A0B] flex flex-col h-full transition-all duration-500 ease-out ${
      isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(255,255,255,0.08)] flex-shrink-0">
        <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">
          {getTitle()}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClose()
            }}
            className="p-2 rounded-lg hover:bg-[#1A1D24] transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4 text-[#A7AFBE]" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {renderContent()}
      </div>
    </div>
  )
}

