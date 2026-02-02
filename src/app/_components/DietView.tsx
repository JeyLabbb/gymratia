'use client'

import { useState, useMemo } from 'react'
import { Edit2, Check, X, Plus, ChevronDown, ChevronUp, Search, Download, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { downloadDietPDF } from '@/lib/pdf-utils'

type Meal = {
  name: string
  time: string
  foods: Array<{
    name: string
    quantity: number
    unit: string
    calories: number
    protein: number
    carbs: number
    fats: number
  }>
}

type FoodCategory = {
  name: string
  category: 'proteins' | 'carbs' | 'vegetables' | 'fats' | 'fruits' | 'dairy' | 'other'
  quantity?: number
  unit?: string
  notes?: string
}

type MealPlanDay = {
  date: string // YYYY-MM-DD
  meals: Meal[]
  workoutTime?: string
  workoutType?: string
}

type DietData = {
  title?: string
  description?: string
  daily_calories?: number
  daily_protein?: number
  daily_carbs?: number
  daily_fats?: number
  meals?: Meal[] // Legacy: comidas del día (temporal, será reemplazado por meal_plan)
  meal_plan?: MealPlanDay[] // Nuevo: plan semanal
  allowed_foods?: {
    [key: string]: FoodCategory[] // Key is category name (proteins, carbs, etc.)
  }
  controlled_foods?: {
    [key: string]: FoodCategory[]
  }
  prohibited_foods?: {
    [key: string]: FoodCategory[]
  }
  daily_organization?: {
    morning?: string
    pre_workout?: string
    post_workout?: string
    evening?: string
    general_guidelines?: string
  }
  recommendations?: {
    water?: string
    supplements?: string[]
    timing?: string
    other?: string[]
  }
}

type DietViewProps = {
  dietData: DietData
  onEdit?: () => void
  editable?: boolean
  hideTitle?: boolean // Hide title if it's shown in parent component
  activeTrainerSlug?: 'edu' | 'carolina' | 'jey' | string | null
  compactOnMobile?: boolean // Foods first, macros in collapsible on mobile
}

// Helper function to normalize category names
function normalizeCategoryName(category: string): string {
  const mappings: Record<string, string> = {
    'proteins': 'Proteínas',
    'carbs': 'Carbohidratos',
    'vegetables': 'Verduras',
    'vegetables_free': 'Verduras Libres',
    'vegetables_controlled': 'Verduras Controladas',
    'fats': 'Grasas',
    'fruits': 'Frutas',
    'fruits_allowed': 'Frutas Permitidas',
    'fruits_prohibited': 'Frutas Prohibidas',
    'dairy': 'Lácteos',
    'cheese_allowed': 'Quesos Permitidos',
    'cheese_prohibited': 'Quesos Prohibidos',
    'meats_allowed': 'Carnes Permitidas',
    'meats_prohibited': 'Carnes Prohibidas',
    'fish_white': 'Pescados Blancos',
    'fish_blue': 'Pescado Azul',
    'seafood': 'Mariscos',
    'eggs': 'Huevos',
    'oils': 'Aceites',
    'condiments_allowed': 'Condimentos Permitidos',
    'condiments_prohibited': 'Condimentos Prohibidos',
    'drinks_prohibited': 'Bebidas Prohibidas',
    'other': 'Otros'
  }
  
  return mappings[category] || category.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

export function DietView({ dietData, onEdit, editable = false, hideTitle = false, activeTrainerSlug, compactOnMobile = true }: DietViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'allowed' | 'controlled' | 'prohibited'>('allowed')

  const totalMacros = dietData.meals?.reduce((acc, meal) => {
    const mealFoods = meal?.foods != null && Array.isArray(meal.foods) ? meal.foods : []
    const mealMacros = mealFoods.reduce((mealAcc, food) => ({
      calories: mealAcc.calories + (food?.calories ?? 0),
      protein: mealAcc.protein + (food?.protein ?? 0),
      carbs: mealAcc.carbs + (food?.carbs ?? 0),
      fats: mealAcc.fats + (food?.fats ?? 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 })
    
    return {
      calories: acc.calories + mealMacros.calories,
      protein: acc.protein + mealMacros.protein,
      carbs: acc.carbs + mealMacros.carbs,
      fats: acc.fats + mealMacros.fats,
    }
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 }) || { calories: 0, protein: 0, carbs: 0, fats: 0 }

  // Helper to normalize foods array
  const normalizeFoods = (foods: any): any[] => {
    if (!foods) return []
    const foodsArray = Array.isArray(foods) ? foods : []
    return foodsArray.map((food: any) => {
      if (typeof food === 'string') {
        return { name: food }
      }
      // Si es un objeto con estructura {food, reason, control} o similar
      if (food && typeof food === 'object') {
        // Si tiene propiedad 'food', usar esa como nombre
        if (food.food) {
          return {
            name: food.food,
            reason: food.reason,
            control: food.control,
            quantity: food.quantity,
            unit: food.unit,
            notes: food.notes || food.reason
          }
        }
        // Si ya tiene 'name', devolverlo tal cual
        if (food.name) {
          return food
        }
      }
      return food
    })
  }

  // Get all foods for search
  const getAllFoods = () => {
    const allFoods: Array<{ name: string; category: string; type: 'allowed' | 'controlled' | 'prohibited'; food: any }> = []
    
    if (dietData.allowed_foods) {
      Object.entries(dietData.allowed_foods).forEach(([category, foods]) => {
        normalizeFoods(foods).forEach((food: any) => {
          const foodName = food?.name || (typeof food === 'string' ? food : food?.food || 'Alimento')
          allFoods.push({
            name: foodName,
            category,
            type: 'allowed',
            food
          })
        })
      })
    }
    
    if (dietData.controlled_foods) {
      Object.entries(dietData.controlled_foods).forEach(([category, foods]) => {
        normalizeFoods(foods).forEach((food: any) => {
          const foodName = food?.name || (typeof food === 'string' ? food : food?.food || 'Alimento')
          allFoods.push({
            name: foodName,
            category,
            type: 'controlled',
            food
          })
        })
      })
    }
    
    if (dietData.prohibited_foods) {
      Object.entries(dietData.prohibited_foods).forEach(([category, foods]) => {
        normalizeFoods(foods).forEach((food: any) => {
          const foodName = food?.name || (typeof food === 'string' ? food : food?.food || 'Alimento')
          allFoods.push({
            name: foodName,
            category,
            type: 'prohibited',
            food
          })
        })
      })
    }
    
    return allFoods
  }

  // Filter foods by search query
  const filteredFoods = useMemo(() => {
    if (!searchQuery.trim()) return getAllFoods()
    const query = searchQuery.toLowerCase()
    return getAllFoods().filter(f => 
      f.name.toLowerCase().includes(query) ||
      normalizeCategoryName(f.category).toLowerCase().includes(query)
    )
  }, [searchQuery, dietData.allowed_foods, dietData.controlled_foods, dietData.prohibited_foods])

  // Count foods by type
  const foodCounts = useMemo(() => {
    const allowed = dietData.allowed_foods ? 
      Object.values(dietData.allowed_foods).reduce((sum, foods) => sum + normalizeFoods(foods).length, 0) : 0
    const controlled = dietData.controlled_foods ? 
      Object.values(dietData.controlled_foods).reduce((sum, foods) => sum + normalizeFoods(foods).length, 0) : 0
    const prohibited = dietData.prohibited_foods ? 
      Object.values(dietData.prohibited_foods).reduce((sum, foods) => sum + normalizeFoods(foods).length, 0) : 0
    return { allowed, controlled, prohibited }
  }, [dietData.allowed_foods, dietData.controlled_foods, dietData.prohibited_foods])

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }))
  }

  // Check if title already contains description to avoid duplication
  // Asegurar que title y description sean strings, no objetos
  const title = typeof dietData.title === 'string' ? dietData.title : (dietData.title ? String(dietData.title) : 'Dieta Personalizada')
  const description = typeof dietData.description === 'string' ? dietData.description : (dietData.description ? String(dietData.description) : '')
  const titleContainsDescription = description && typeof description === 'string' && typeof title === 'string' && title.toLowerCase().includes(description.toLowerCase().substring(0, 20))

  const macrosSection = (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[10px] sm:rounded-[12px] p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-[#A7AFBE] mb-0.5 sm:mb-1">Calorías</p>
          <p className="text-lg sm:text-2xl font-heading font-bold text-[#FF2D2D]">
            {Math.round(totalMacros.calories || dietData.daily_calories || 0)}
          </p>
          {dietData.daily_calories && (
            <p className="text-[10px] sm:text-xs text-[#7B8291] mt-0.5 sm:mt-1">
              Objetivo: {dietData.daily_calories}
            </p>
          )}
        </div>
        <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[10px] sm:rounded-[12px] p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-[#A7AFBE] mb-0.5 sm:mb-1">Proteína</p>
          <p className="text-lg sm:text-2xl font-heading font-bold text-[#F8FAFC]">
            {Math.round(totalMacros.protein || dietData.daily_protein || 0)}g
          </p>
          {dietData.daily_protein && (
            <p className="text-[10px] sm:text-xs text-[#7B8291] mt-0.5 sm:mt-1">
              Objetivo: {dietData.daily_protein}g
            </p>
          )}
        </div>
        <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[10px] sm:rounded-[12px] p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-[#A7AFBE] mb-0.5 sm:mb-1">Carbohidratos</p>
          <p className="text-lg sm:text-2xl font-heading font-bold text-[#F8FAFC]">
            {Math.round(totalMacros.carbs || dietData.daily_carbs || 0)}g
          </p>
          {dietData.daily_carbs && (
            <p className="text-[10px] sm:text-xs text-[#7B8291] mt-0.5 sm:mt-1">
              Objetivo: {dietData.daily_carbs}g
            </p>
          )}
        </div>
        <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[10px] sm:rounded-[12px] p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-[#A7AFBE] mb-0.5 sm:mb-1">Grasas</p>
          <p className="text-lg sm:text-2xl font-heading font-bold text-[#F8FAFC]">
            {Math.round(totalMacros.fats || dietData.daily_fats || 0)}g
          </p>
          {dietData.daily_fats && (
            <p className="text-[10px] sm:text-xs text-[#7B8291] mt-0.5 sm:mt-1">
              Objetivo: {dietData.daily_fats}g
            </p>
          )}
        </div>
      </div>
  )

  return (
    <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", compactOnMobile ? "flex flex-col gap-4 sm:gap-6" : "space-y-4 sm:space-y-6", compactOnMobile && "flex")}>
      {/* Header - compact on mobile when compactOnMobile */}
      {!hideTitle && (
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h4 className="font-heading text-base sm:text-xl font-bold text-[#F8FAFC] mb-0.5 sm:mb-2 truncate">
              {title}
            </h4>
            {description && !titleContainsDescription && (
              <p className="text-xs sm:text-sm text-[#A7AFBE] line-clamp-2 sm:line-clamp-none">{description}</p>
            )}
          </div>
        {editable && onEdit && (
          <button
            onClick={() => {
              setIsEditing(true)
              onEdit()
            }}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-[#1A1D24] transition-colors flex-shrink-0"
          >
            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF2D2D]" />
          </button>
        )}
        </div>
      )}

      {/* Macros: collapsible on mobile (Resumen del plan), full on desktop - order 3 after foods and org */}
      <div className={cn(compactOnMobile && "order-3")}>
        {compactOnMobile ? (
          <>
            <details className="md:hidden group">
              <summary className="flex items-center justify-between p-3 rounded-[12px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] cursor-pointer list-none">
                <span className="text-sm font-semibold text-[#F8FAFC]">Resumen del plan (kcal, macros)</span>
                <ChevronRight className="w-4 h-4 text-[#A7AFBE] group-open:rotate-90 transition-transform" />
              </summary>
              <div className="mt-2">
                {macrosSection}
              </div>
            </details>
            <div className="hidden md:block">{macrosSection}</div>
          </>
        ) : (
          macrosSection
        )}
      </div>

      {/* Food Categories - first on mobile when compactOnMobile */}
      {(dietData.allowed_foods || dietData.controlled_foods || dietData.prohibited_foods) && (
        <div className={cn("space-y-4 sm:space-y-6", compactOnMobile && "order-1 md:order-2")}>
          <div className="flex items-center justify-between gap-2">
            <h5 className="font-heading text-sm sm:text-lg font-bold text-[#F8FAFC]">Alimentos</h5>
            <button
              onClick={() => {
                downloadDietPDF(
                  title,
                  description,
                  dietData.allowed_foods,
                  dietData.controlled_foods,
                  dietData.prohibited_foods,
                  dietData.daily_organization,
                  dietData.recommendations
                )
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#FF2D2D] hover:bg-[#FF4444] text-white text-[11px] sm:text-sm rounded-lg transition-colors flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {/* Allowed Foods Card */}
            <button
              onClick={() => setActiveTab('allowed')}
              className={cn(
                "bg-[#14161B] border rounded-[10px] sm:rounded-[12px] p-2.5 sm:p-4 text-left transition-all",
                activeTab === 'allowed' 
                  ? "border-[#22C55E] bg-[rgba(34,197,94,0.1)]" 
                  : "border-[rgba(34,197,94,0.2)] hover:border-[rgba(34,197,94,0.4)]"
              )}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#22C55E]"></span>
                <h6 className="font-heading font-bold text-[#22C55E] text-xs sm:text-sm">Permitidos</h6>
              </div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-[#F8FAFC]">{foodCounts.allowed}</p>
              <p className="text-[10px] sm:text-xs text-[#A7AFBE] mt-0.5 sm:mt-1">alimentos</p>
            </button>

            {/* Controlled Foods Card */}
            <button
              onClick={() => setActiveTab('controlled')}
              className={cn(
                "bg-[#14161B] border rounded-[10px] sm:rounded-[12px] p-2.5 sm:p-4 text-left transition-all",
                activeTab === 'controlled' 
                  ? "border-[#FBBF24] bg-[rgba(251,191,36,0.1)]" 
                  : "border-[rgba(251,191,36,0.2)] hover:border-[rgba(251,191,36,0.4)]"
              )}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#FBBF24]"></span>
                <h6 className="font-heading font-bold text-[#FBBF24] text-xs sm:text-sm">Controlados</h6>
              </div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-[#F8FAFC]">{foodCounts.controlled}</p>
              <p className="text-[10px] sm:text-xs text-[#A7AFBE] mt-0.5 sm:mt-1">alimentos</p>
            </button>

            {/* Prohibited Foods Card */}
            <button
              onClick={() => setActiveTab('prohibited')}
              className={cn(
                "bg-[#14161B] border rounded-[10px] sm:rounded-[12px] p-2.5 sm:p-4 text-left transition-all",
                activeTab === 'prohibited' 
                  ? "border-[#EF4444] bg-[rgba(239,68,68,0.1)]" 
                  : "border-[rgba(239,68,68,0.2)] hover:border-[rgba(239,68,68,0.4)]"
              )}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#EF4444]"></span>
                <h6 className="font-heading font-bold text-[#EF4444] text-xs sm:text-sm">Prohibidos</h6>
              </div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-[#F8FAFC]">{foodCounts.prohibited}</p>
              <p className="text-[10px] sm:text-xs text-[#A7AFBE] mt-0.5 sm:mt-1">alimentos</p>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A7AFBE]" />
            <input
              type="text"
              placeholder="Buscar alimentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs sm:text-sm text-[#F8FAFC] placeholder-[#7B8291] focus:outline-none focus:border-[#FF2D2D] transition-colors"
            />
          </div>

          {/* Food Lists with Collapsible Categories */}
          {searchQuery.trim() ? (
            // Search Results
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4">
              <h6 className="font-heading font-bold text-[#F8FAFC] mb-3">
                Resultados de búsqueda ({filteredFoods.length})
              </h6>
              <div className="space-y-2">
                {filteredFoods.map((item, idx) => (
                  <div key={idx} className="text-sm text-[#A7AFBE] p-2 rounded bg-[rgba(255,255,255,0.03)]">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        item.type === 'allowed' ? "bg-[#22C55E]" :
                        item.type === 'controlled' ? "bg-[#FBBF24]" : "bg-[#EF4444]"
                      )}></span>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-[#7B8291]">
                        ({normalizeCategoryName(item.category)})
                      </span>
                    </div>
                    {item.food.quantity && item.food.unit && (
                      <p className="text-xs text-[#7B8291] ml-4">
                        {item.food.quantity}{item.food.unit}
                      </p>
                    )}
                    {item.food.notes && (
                      <p className="text-xs text-[#7B8291] ml-4">{item.food.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Category Lists
            <div className="space-y-4">
              {/* Allowed Foods */}
              {activeTab === 'allowed' && dietData.allowed_foods && Object.keys(dietData.allowed_foods).length > 0 && (
                <div className="bg-[#14161B] border border-[rgba(34,197,94,0.2)] rounded-[12px] p-4">
                  <h6 className="font-heading font-bold text-[#22C55E] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
                    Alimentos Permitidos
                  </h6>
                  <div className="space-y-3">
                    {Object.entries(dietData.allowed_foods).map(([category, foods]) => {
                      const normalizedFoods = normalizeFoods(foods)
                      if (normalizedFoods.length === 0) return null
                      const categoryKey = `allowed-${category}`
                      const isExpanded = expandedCategories[categoryKey] ?? true
                      
                      return (
                        <div key={category} className="border-b border-[rgba(255,255,255,0.05)] last:border-0 pb-3 last:pb-0">
                          <button
                            onClick={() => toggleCategory(categoryKey)}
                            className="w-full flex items-center justify-between text-left"
                          >
                            <p className="text-sm font-semibold text-[#F8FAFC]">
                              {normalizeCategoryName(category)}
                            </p>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[#A7AFBE]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#A7AFBE]" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="mt-2 space-y-1">
                              {normalizedFoods.map((food, idx) => {
                                const foodName = food?.name || (typeof food === 'string' ? food : 'Alimento')
                                return (
                                  <div key={idx} className="text-sm text-[#A7AFBE] pl-2">
                                    • {foodName}
                                    {food.quantity && food.unit && ` (${food.quantity}${food.unit})`}
                                    {food.notes && <span className="text-xs text-[#7B8291] ml-2">- {food.notes}</span>}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Controlled Foods */}
              {activeTab === 'controlled' && dietData.controlled_foods && Object.keys(dietData.controlled_foods).length > 0 && (
                <div className="bg-[#14161B] border border-[rgba(251,191,36,0.2)] rounded-[12px] p-4">
                  <h6 className="font-heading font-bold text-[#FBBF24] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FBBF24]"></span>
                    Alimentos a Controlar
                  </h6>
                  <div className="space-y-3">
                    {Object.entries(dietData.controlled_foods).map(([category, foods]) => {
                      const normalizedFoods = normalizeFoods(foods)
                      if (normalizedFoods.length === 0) return null
                      const categoryKey = `controlled-${category}`
                      const isExpanded = expandedCategories[categoryKey] ?? true
                      
                      return (
                        <div key={category} className="border-b border-[rgba(255,255,255,0.05)] last:border-0 pb-3 last:pb-0">
                          <button
                            onClick={() => toggleCategory(categoryKey)}
                            className="w-full flex items-center justify-between text-left"
                          >
                            <p className="text-sm font-semibold text-[#F8FAFC]">
                              {normalizeCategoryName(category)}
                            </p>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[#A7AFBE]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#A7AFBE]" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="mt-2 space-y-1">
                              {normalizedFoods.map((food, idx) => {
                                const foodName = food?.name || (typeof food === 'string' ? food : 'Alimento')
                                return (
                                  <div key={idx} className="text-sm text-[#A7AFBE] pl-2">
                                    • {foodName}
                                    {food.quantity && food.unit && ` (${food.quantity}${food.unit})`}
                                    {food.notes && <span className="text-xs text-[#7B8291] ml-2">- {food.notes}</span>}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Prohibited Foods */}
              {activeTab === 'prohibited' && dietData.prohibited_foods && Object.keys(dietData.prohibited_foods).length > 0 && (
                <div className="bg-[#14161B] border border-[rgba(239,68,68,0.2)] rounded-[12px] p-4">
                  <h6 className="font-heading font-bold text-[#EF4444] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                    Alimentos Prohibidos
                  </h6>
                  <div className="space-y-3">
                    {Object.entries(dietData.prohibited_foods).map(([category, foods]) => {
                      const normalizedFoods = normalizeFoods(foods)
                      if (normalizedFoods.length === 0) return null
                      const categoryKey = `prohibited-${category}`
                      const isExpanded = expandedCategories[categoryKey] ?? true
                      
                      return (
                        <div key={category} className="border-b border-[rgba(255,255,255,0.05)] last:border-0 pb-3 last:pb-0">
                          <button
                            onClick={() => toggleCategory(categoryKey)}
                            className="w-full flex items-center justify-between text-left"
                          >
                            <p className="text-sm font-semibold text-[#F8FAFC]">
                              {normalizeCategoryName(category)}
                            </p>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[#A7AFBE]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#A7AFBE]" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="mt-2 space-y-1">
                              {normalizedFoods.map((food, idx) => {
                                const foodName = food?.name || (typeof food === 'string' ? food : 'Alimento')
                                return (
                                  <div key={idx} className="text-sm text-[#A7AFBE] pl-2">
                                    • {foodName}
                                    {food.notes && <span className="text-xs text-[#7B8291] ml-2">- {food.notes}</span>}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Daily Organization - order 2 after foods */}
      {dietData.daily_organization && (
        <div className={cn("bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[10px] sm:rounded-[12px] p-3 sm:p-4", compactOnMobile && "order-2")}>
          <h5 className="font-heading text-base sm:text-lg font-bold text-[#F8FAFC] mb-3 sm:mb-4">Organización Diaria</h5>
          <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-[#A7AFBE]">
            {dietData.daily_organization.morning && (
              <div>
                <p className="font-semibold text-[#F8FAFC] mb-1">🌅 Mañana:</p>
                <p>{typeof dietData.daily_organization.morning === 'string' ? dietData.daily_organization.morning : String(dietData.daily_organization.morning)}</p>
              </div>
            )}
            {dietData.daily_organization.pre_workout && (
              <div>
                <p className="font-semibold text-[#F8FAFC] mb-1">💪 Pre-entrenamiento:</p>
                <p>{typeof dietData.daily_organization.pre_workout === 'string' ? dietData.daily_organization.pre_workout : String(dietData.daily_organization.pre_workout)}</p>
              </div>
            )}
            {dietData.daily_organization.post_workout && (
              <div>
                <p className="font-semibold text-[#F8FAFC] mb-1">🔥 Post-entrenamiento:</p>
                <p>{typeof dietData.daily_organization.post_workout === 'string' ? dietData.daily_organization.post_workout : String(dietData.daily_organization.post_workout)}</p>
              </div>
            )}
            {dietData.daily_organization.evening && (
              <div>
                <p className="font-semibold text-[#F8FAFC] mb-1">🌙 Noche:</p>
                <p>{typeof dietData.daily_organization.evening === 'string' ? dietData.daily_organization.evening : String(dietData.daily_organization.evening)}</p>
              </div>
            )}
            {dietData.daily_organization.general_guidelines && (
              <div>
                <p className="font-semibold text-[#F8FAFC] mb-1">📋 Guías Generales:</p>
                <p>{typeof dietData.daily_organization.general_guidelines === 'string' ? dietData.daily_organization.general_guidelines : String(dietData.daily_organization.general_guidelines)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations - order 2 after foods */}
      {dietData.recommendations && (
        <div className={cn("bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[10px] sm:rounded-[12px] p-3 sm:p-4", compactOnMobile && "order-2")}>
          <h5 className="font-heading text-base sm:text-lg font-bold text-[#F8FAFC] mb-3 sm:mb-4">Recomendaciones</h5>
          <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-[#A7AFBE]">
            {dietData.recommendations.water && (
              <div>
                <p className="font-semibold text-[#F8FAFC] mb-1">💧 Agua:</p>
                <p>{dietData.recommendations.water}</p>
              </div>
            )}
            {dietData.recommendations.supplements && (
              <div>
                <p className="font-semibold text-[#F8FAFC] mb-1">💊 Suplementos:</p>
                {Array.isArray(dietData.recommendations.supplements) ? (
                  <ul className="list-disc list-inside space-y-1">
                    {dietData.recommendations.supplements.map((supp, idx) => (
                      <li key={idx}>{supp}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{dietData.recommendations.supplements}</p>
                )}
              </div>
            )}
            {dietData.recommendations.timing && (
              <div>
                <p className="font-semibold text-[#F8FAFC] mb-1">⏰ Timing:</p>
                <p>{typeof dietData.recommendations.timing === 'string' ? dietData.recommendations.timing : String(dietData.recommendations.timing)}</p>
              </div>
            )}
            {dietData.recommendations.other && (
              <div>
                <p className="font-semibold text-[#F8FAFC] mb-1">📌 Otras recomendaciones:</p>
                {Array.isArray(dietData.recommendations.other) ? (
                  <ul className="list-disc list-inside space-y-1">
                    {dietData.recommendations.other.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{dietData.recommendations.other}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

