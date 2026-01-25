'use client'

import { useState } from 'react'
import { Calendar, Edit2 } from 'lucide-react'

type MealFood = {
  name: string
  quantity: number
  unit: string
  calories: number
  protein: number
  carbs: number
  fats: number
}

type Meal = {
  name: string
  time: string
  foods: MealFood[]
}

type MealPlannerData = {
  date: string
  meals: Meal[]
  total_calories?: number
  total_protein?: number
  total_carbs?: number
  total_fats?: number
  notes?: string
}

type MealPlannerViewProps = {
  plannerData: MealPlannerData
  onEdit?: () => void
  editable?: boolean
}

export function MealPlannerView({ plannerData, onEdit, editable = false }: MealPlannerViewProps) {
  const date = new Date(plannerData.date)
  const formattedDate = date.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[#FF2D2D]" />
          <div>
            <h4 className="font-heading text-xl font-bold text-[#F8FAFC] capitalize">
              {formattedDate}
            </h4>
            {plannerData.notes && (
              <p className="text-sm text-[#A7AFBE] mt-1">{plannerData.notes}</p>
            )}
          </div>
        </div>
        {editable && onEdit && (
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-[#1A1D24] transition-colors"
          >
            <Edit2 className="w-4 h-4 text-[#FF2D2D]" />
          </button>
        )}
      </div>

      {/* Daily Totals */}
      {(plannerData.total_calories || plannerData.total_protein) && (
        <div className="grid grid-cols-4 gap-4">
          {plannerData.total_calories && (
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4">
              <p className="text-xs text-[#A7AFBE] mb-1">Total Calorías</p>
              <p className="text-2xl font-heading font-bold text-[#FF2D2D]">
                {Math.round(plannerData.total_calories)}
              </p>
            </div>
          )}
          {plannerData.total_protein && (
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4">
              <p className="text-xs text-[#A7AFBE] mb-1">Proteína</p>
              <p className="text-2xl font-heading font-bold text-[#F8FAFC]">
                {Math.round(plannerData.total_protein)}g
              </p>
            </div>
          )}
          {plannerData.total_carbs && (
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4">
              <p className="text-xs text-[#A7AFBE] mb-1">Carbohidratos</p>
              <p className="text-2xl font-heading font-bold text-[#F8FAFC]">
                {Math.round(plannerData.total_carbs)}g
              </p>
            </div>
          )}
          {plannerData.total_fats && (
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4">
              <p className="text-xs text-[#A7AFBE] mb-1">Grasas</p>
              <p className="text-2xl font-heading font-bold text-[#F8FAFC]">
                {Math.round(plannerData.total_fats)}g
              </p>
            </div>
          )}
        </div>
      )}

      {/* Meals */}
      <div className="space-y-4">
        {plannerData.meals.map((meal, mealIdx) => {
          const mealCalories = meal.foods.reduce((sum, f) => sum + f.calories, 0)
          const mealProtein = meal.foods.reduce((sum, f) => sum + f.protein, 0)
          const mealCarbs = meal.foods.reduce((sum, f) => sum + f.carbs, 0)
          const mealFats = meal.foods.reduce((sum, f) => sum + f.fats, 0)

          return (
            <div
              key={mealIdx}
              className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4 animate-in fade-in slide-in-from-left duration-300"
              style={{ animationDelay: `${mealIdx * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h6 className="font-heading font-bold text-[#F8FAFC]">{meal.name}</h6>
                  <p className="text-xs text-[#A7AFBE]">{meal.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#FF2D2D]">{mealCalories} kcal</p>
                  <p className="text-xs text-[#A7AFBE]">
                    P: {Math.round(mealProtein)}g | C: {Math.round(mealCarbs)}g | G: {Math.round(mealFats)}g
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {meal.foods.map((food, foodIdx) => (
                  <div
                    key={foodIdx}
                    className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.05)] last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-[#F8FAFC] font-medium">{food.name}</p>
                      <p className="text-xs text-[#A7AFBE]">
                        {food.quantity} {food.unit} • {food.calories} kcal
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}





