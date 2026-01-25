'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Edit2, Download, MessageSquare, X, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { downloadMealPlanPDF } from '@/lib/pdf-utils'
import { AddMealModal } from './AddMealModal'

type MealPlanDay = {
  date: string // YYYY-MM-DD
  meals: Array<{
    name: string
    time: string
    foods: Array<{
      name: string
      quantity: number
      unit: string
      calories?: number
      protein?: number
      carbs?: number
      fats?: number
    }>
  }>
  workoutTime?: string
  workoutType?: string
}

type MealPlanCalendarProps = {
  mealPlan?: MealPlanDay[]
  onDayClick?: (date: string) => void
  onEdit?: () => void
  editable?: boolean
  onMealPlanUpdate?: (updatedPlan: MealPlanDay[]) => void
  activeTrainerSlug?: 'edu' | 'carolina' | 'jey' | string | null
}

export function MealPlanCalendar({ mealPlan, onDayClick, onEdit, editable = false, onMealPlanUpdate, activeTrainerSlug }: MealPlanCalendarProps) {
  const router = useRouter()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [isAddMealModalOpen, setIsAddMealModalOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [localMealPlan, setLocalMealPlan] = useState<MealPlanDay[]>(mealPlan || [])

  // Get start of week (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    return new Date(d.setDate(diff))
  }

  const weekStart = getWeekStart(currentWeek)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    return date
  })

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('es-ES', { weekday: 'short' })
  }

  const formatDayNumber = (date: Date) => {
    return date.getDate()
  }

  const getMealPlanForDate = (date: Date) => {
    const dateStr = formatDate(date)
    return localMealPlan.find(day => day.date === dateStr)
  }

  // Get sorted meals for selected day (sorted by time)
  const sortedMealsForSelectedDay = useMemo(() => {
    if (!selectedDay) return []
    const dayPlan = getMealPlanForDate(new Date(selectedDay))
    if (!dayPlan || !dayPlan.meals) return []
    
    // Sort meals by time (HH:MM format)
    return [...dayPlan.meals].sort((a, b) => {
      const timeA = a.time.split(':').map(Number)
      const timeB = b.time.split(':').map(Number)
      const minutesA = timeA[0] * 60 + timeA[1]
      const minutesB = timeB[0] * 60 + timeB[1]
      return minutesA - minutesB
    })
  }, [selectedDay, localMealPlan])

  const handleAddMeal = (meal: Meal) => {
    if (!selectedDay) return

    const existingDay = localMealPlan.find(d => d.date === selectedDay)
    
    if (existingDay) {
      // Update existing day
      const updatedPlan = localMealPlan.map(day => {
        if (day.date === selectedDay) {
          if (editingMeal) {
            // Replace existing meal
            const mealIndex = day.meals.findIndex(m => m.name === editingMeal.name && m.time === editingMeal.time)
            if (mealIndex >= 0) {
              const updatedMeals = [...day.meals]
              updatedMeals[mealIndex] = meal
              return { ...day, meals: updatedMeals }
            }
          }
          // Add new meal
          return { ...day, meals: [...day.meals, meal] }
        }
        return day
      })
      setLocalMealPlan(updatedPlan)
      onMealPlanUpdate?.(updatedPlan)
    } else {
      // Create new day
      const newDay: MealPlanDay = {
        date: selectedDay,
        meals: [meal]
      }
      const updatedPlan = [...localMealPlan, newDay]
      setLocalMealPlan(updatedPlan)
      onMealPlanUpdate?.(updatedPlan)
    }

    setEditingMeal(null)
    setIsAddMealModalOpen(false)
  }

  const handleEditMeal = (meal: Meal) => {
    setEditingMeal(meal)
    setIsAddMealModalOpen(true)
  }

  const handleDeleteMeal = (mealName: string, mealTime: string) => {
    if (!selectedDay) return

    const updatedPlan = localMealPlan.map(day => {
      if (day.date === selectedDay) {
        return {
          ...day,
          meals: day.meals.filter(m => !(m.name === mealName && m.time === mealTime))
        }
      }
      return day
    })
    setLocalMealPlan(updatedPlan)
    onMealPlanUpdate?.(updatedPlan)
  }

  const nextWeek = () => {
    const next = new Date(currentWeek)
    next.setDate(next.getDate() + 7)
    setCurrentWeek(next)
  }

  const prevWeek = () => {
    const prev = new Date(currentWeek)
    prev.setDate(prev.getDate() - 7)
    setCurrentWeek(prev)
  }

  const handleDayClick = (date: Date) => {
    const dateStr = formatDate(date)
    setSelectedDay(selectedDay === dateStr ? null : dateStr)
    onDayClick?.(dateStr)
  }

  // Update local meal plan when prop changes
  useEffect(() => {
    if (mealPlan) {
      setLocalMealPlan(mealPlan)
    }
  }, [mealPlan])

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <button
          onClick={prevWeek}
          className="p-2 rounded-lg hover:bg-[#1A1D24] transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[#F8FAFC]" />
        </button>
          <h6 className="font-heading font-bold text-[#F8FAFC]">
            {weekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h6>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const weekStartDate = getWeekStart(currentWeek)
              downloadMealPlanPDF(localMealPlan, weekStartDate)
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#FF2D2D] hover:bg-[#FF4444] text-white text-sm rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Descargar Calendario
          </button>
          <button
            onClick={prevWeek}
            className="p-2 rounded-lg hover:bg-[#1A1D24] transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#F8FAFC]" />
          </button>
          <button
            onClick={nextWeek}
            className="p-2 rounded-lg hover:bg-[#1A1D24] transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#F8FAFC]" />
          </button>
        </div>
      </div>

      {/* Calendar Grid - Horizontal Scroll */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {weekDays.map((day, idx) => {
            const dayPlan = getMealPlanForDate(day)
            const dateStr = formatDate(day)
            const isSelected = selectedDay === dateStr
            const isToday = formatDate(new Date()) === dateStr

            return (
              <div
                key={idx}
                className={cn(
                  "flex-shrink-0 w-48 bg-[#14161B] border rounded-[12px] p-4 cursor-pointer transition-all",
                  isSelected 
                    ? "border-[#FF2D2D] bg-[rgba(255,45,45,0.1)]" 
                    : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]",
                  isToday && "ring-2 ring-[#FF2D2D]/50"
                )}
                onClick={() => handleDayClick(day)}
              >
                {/* Day Header */}
                <div className="mb-3 pb-3 border-b border-[rgba(255,255,255,0.05)]">
                  <p className="text-xs text-[#A7AFBE] uppercase">{formatDayName(day)}</p>
                  <p className={cn(
                    "text-lg font-heading font-bold",
                    isToday ? "text-[#FF2D2D]" : "text-[#F8FAFC]"
                  )}>
                    {formatDayNumber(day)}
                  </p>
                  {dayPlan?.workoutTime && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D2D]"></span>
                      <span className="text-xs text-[#FF2D2D]">{dayPlan.workoutTime}</span>
                    </div>
                  )}
                </div>

                {/* Meals */}
                {dayPlan && dayPlan.meals.length > 0 ? (
                  <div className="space-y-2">
                    {dayPlan.meals.map((meal, mealIdx) => (
                      <div key={mealIdx} className="bg-[rgba(255,255,255,0.03)] rounded-lg p-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-[#F8FAFC]">{meal.name}</p>
                          <p className="text-xs text-[#A7AFBE]">{meal.time}</p>
                        </div>
                        <div className="space-y-1">
                          {meal.foods.slice(0, 2).map((food, foodIdx) => (
                            <p key={foodIdx} className="text-xs text-[#A7AFBE] truncate">
                              • {food.name} {food.quantity}{food.unit}
                            </p>
                          ))}
                          {meal.foods.length > 2 && (
                            <p className="text-xs text-[#7B8291]">
                              +{meal.foods.length - 2} más
                            </p>
                          )}
                        </div>
                        {meal.foods.reduce((sum, f) => sum + (f.calories || 0), 0) > 0 && (
                          <p className="text-xs text-[#FF2D2D] mt-1 font-medium">
                            {meal.foods.reduce((sum, f) => sum + (f.calories || 0), 0)} kcal
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Plus className="w-6 h-6 text-[#7B8291] mb-2" />
                    <p className="text-xs text-[#A7AFBE]">Sin comidas</p>
                    <p className="text-xs text-[#7B8291] mt-1">Click para añadir</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDay && (
        <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4">
          <div className="flex items-center justify-between mb-4">
            <h6 className="font-heading font-bold text-[#F8FAFC]">
              {new Date(selectedDay).toLocaleDateString('es-ES', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </h6>
            {editable && onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg hover:bg-[#1A1D24] transition-colors"
              >
                <Edit2 className="w-4 h-4 text-[#FF2D2D]" />
              </button>
            )}
          </div>
          <div className="space-y-3">
            {/* Botón Añadir Comida - SIEMPRE visible */}
            <button
              onClick={() => {
                setEditingMeal(null)
                setIsAddMealModalOpen(true)
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF2D2D] hover:bg-[#FF4444] text-white rounded-lg transition-colors text-sm font-medium mb-3"
            >
              <Plus className="w-4 h-4" />
              Añadir Comida
            </button>

            {/* Comidas ordenadas por hora */}
            {sortedMealsForSelectedDay.length > 0 ? (
              <div className="space-y-2">
                {sortedMealsForSelectedDay.map((meal, mealIdx) => (
                  <div 
                    key={`${meal.name}-${meal.time}-${mealIdx}`} 
                    className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-[#FF2D2D] bg-[#FF2D2D]/10 px-2 py-0.5 rounded">
                            {meal.time}
                          </span>
                          <h6 className="font-heading font-semibold text-[#F8FAFC]">{meal.name}</h6>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditMeal(meal)}
                          className="p-1.5 rounded-lg hover:bg-[#1A1D24] transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4 text-[#FF2D2D]" />
                        </button>
                        <button
                          onClick={() => handleDeleteMeal(meal.name, meal.time)}
                          className="p-1.5 rounded-lg hover:bg-[#1A1D24] transition-colors"
                          title="Eliminar"
                        >
                          <X className="w-4 h-4 text-[#EF4444]" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {meal.foods.map((food, foodIdx) => (
                        <div key={foodIdx} className="flex items-center justify-between text-sm py-1">
                          <div className="flex-1">
                            <p className="text-[#F8FAFC] font-medium">{food.name}</p>
                            <p className="text-xs text-[#A7AFBE]">
                              {food.quantity} {food.unit}
                            </p>
                          </div>
                          {(food.calories || food.protein || food.carbs || food.fats) && (
                            <div className="text-xs text-[#A7AFBE] text-right ml-2">
                              {food.calories && <p className="font-medium">{food.calories} kcal</p>}
                              {(food.protein || food.carbs || food.fats) && (
                                <p className="text-[#7B8291]">
                                  P:{food.protein || 0}g C:{food.carbs || 0}g G:{food.fats || 0}g
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-[#A7AFBE] mb-4">No hay comidas planificadas para este día</p>
                {activeTrainerSlug && (
                  <button
                    onClick={() => {
                      router.push(`/dashboard/chat/${activeTrainerSlug}?openMealPlanPanel=true&selectedDate=${selectedDay}`)
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] hover:border-[#FF2D2D]/50 text-[#F8FAFC] rounded-lg transition-colors text-sm font-medium mx-auto"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Planificar con {activeTrainerSlug === 'edu' ? 'Edu' : 'Carolina'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Meal Modal */}
      {selectedDay && (
        <AddMealModal
          isOpen={isAddMealModalOpen}
          onClose={() => {
            setIsAddMealModalOpen(false)
            setEditingMeal(null)
          }}
          onSave={handleAddMeal}
          existingMeal={editingMeal || undefined}
          date={selectedDay}
        />
      )}
    </div>
  )
}

