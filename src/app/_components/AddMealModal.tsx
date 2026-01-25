'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Food = {
  name: string
  quantity: number
  unit: string
  calories?: number
  protein?: number
  carbs?: number
  fats?: number
}

type Meal = {
  name: string
  time: string
  foods: Food[]
  recipe?: string
  mealType?: string
}

type AddMealModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (meal: Meal) => void
  existingMeal?: Meal
  date: string
}

export function AddMealModal({ isOpen, onClose, onSave, existingMeal, date }: AddMealModalProps) {
  const [mealName, setMealName] = useState(existingMeal?.name || '')
  const [mealTime, setMealTime] = useState(existingMeal?.time || '')
  const [mealType, setMealType] = useState(existingMeal?.mealType || '')
  const [recipe, setRecipe] = useState(existingMeal?.recipe || '')
  const [foods, setFoods] = useState<Food[]>(existingMeal?.foods || [])

  const mealTypes = ['Desayuno', 'Media Mañana', 'Comida', 'Merienda', 'Cena', 'Antes de Dormir', 'Otro']

  // Cargar datos guardados de localStorage al abrir (solo si no hay existingMeal)
  useEffect(() => {
    if (isOpen && !existingMeal && typeof window !== 'undefined') {
      const savedData = localStorage.getItem('add-meal-modal-form')
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          setMealName(parsed.mealName || '')
          setMealTime(parsed.mealTime || '')
          setMealType(parsed.mealType || '')
          setRecipe(parsed.recipe || '')
          setFoods(parsed.foods || [])
        } catch (e) {
          console.error('Error parsing saved form data:', e)
        }
      }
    }
  }, [isOpen, existingMeal])

  // Guardar datos en localStorage cuando cambien (solo si no hay existingMeal)
  useEffect(() => {
    if (isOpen && !existingMeal && typeof window !== 'undefined') {
      localStorage.setItem('add-meal-modal-form', JSON.stringify({
        mealName,
        mealTime,
        mealType,
        recipe,
        foods
      }))
    }
  }, [mealName, mealTime, mealType, recipe, foods, isOpen, existingMeal])

  // Update form fields when existingMeal changes (when editing a different meal)
  useEffect(() => {
    if (existingMeal) {
      setMealName(existingMeal.name || '')
      setMealTime(existingMeal.time || '')
      setMealType(existingMeal.mealType || '')
      setRecipe(existingMeal.recipe || '')
      setFoods(existingMeal.foods || [])
    } else if (!isOpen) {
      // Reset form when creating a new meal (solo cuando se cierra)
      setMealName('')
      setMealTime('')
      setMealType('')
      setRecipe('')
      setFoods([])
    }
  }, [existingMeal, isOpen])

  if (!isOpen) return null

  const addFood = () => {
    setFoods([...foods, { name: '', quantity: 0, unit: 'g' }])
  }

  const removeFood = (index: number) => {
    setFoods(foods.filter((_, i) => i !== index))
  }

  const updateFood = (index: number, field: keyof Food, value: any) => {
    const updated = [...foods]
    updated[index] = { ...updated[index], [field]: value }
    setFoods(updated)
  }

  const handleSave = () => {
    if (!mealName.trim() || !mealTime.trim() || foods.length === 0) {
      alert('Por favor, completa todos los campos')
      return
    }

    onSave({
      name: mealName,
      time: mealTime,
      foods: foods.filter(f => f.name.trim() !== ''),
      recipe: recipe.trim() || undefined,
      mealType: mealType || undefined
    })
    
    // Reset form
    setMealName('')
    setMealTime('')
    setFoods([])
    // Limpiar localStorage al guardar exitosamente
    if (typeof window !== 'undefined') {
      localStorage.removeItem('add-meal-modal-form')
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[18px] w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.08)]">
          <h3 className="font-heading text-xl font-bold text-[#F8FAFC]">
            {existingMeal ? 'Editar Comida' : 'Añadir Comida'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#1A1D24] transition-colors"
          >
            <X className="w-5 h-5 text-[#A7AFBE]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-[#F8FAFC] mb-2">
              Fecha
            </label>
            <input
              type="text"
              value={new Date(date).toLocaleDateString('es-ES', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
              disabled
              className="w-full px-4 py-2.5 bg-[#0A0A0B] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#A7AFBE] cursor-not-allowed"
            />
          </div>

          {/* Meal Type */}
          <div>
            <label className="block text-sm font-semibold text-[#F8FAFC] mb-2">
              Tipo de Comida *
            </label>
            <select
              value={mealType}
              onChange={(e) => {
                setMealType(e.target.value)
                if (!mealName || mealName === existingMeal?.name) {
                  setMealName(e.target.value)
                }
              }}
              className="w-full px-4 py-2.5 bg-[#0A0A0B] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#FF2D2D] transition-colors"
            >
              <option value="">Selecciona un tipo</option>
              {mealTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Meal Name */}
          <div>
            <label className="block text-sm font-semibold text-[#F8FAFC] mb-2">
              Nombre de la Comida *
            </label>
            <input
              type="text"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="Ej: Desayuno, Comida, Cena..."
              className="w-full px-4 py-2.5 bg-[#0A0A0B] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#F8FAFC] placeholder-[#7B8291] focus:outline-none focus:border-[#FF2D2D] transition-colors"
            />
          </div>

          {/* Meal Time */}
          <div>
            <label className="block text-sm font-semibold text-[#F8FAFC] mb-2">
              Hora *
            </label>
            <input
              type="time"
              value={mealTime}
              onChange={(e) => setMealTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A0A0B] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#FF2D2D] transition-colors"
            />
          </div>

          {/* Recipe/Notes */}
          <div>
            <label className="block text-sm font-semibold text-[#F8FAFC] mb-2">
              Receta / Notas (opcional)
            </label>
            <textarea
              value={recipe}
              onChange={(e) => setRecipe(e.target.value)}
              placeholder="Describe la receta, método de preparación, o cualquier nota adicional..."
              rows={4}
              className="w-full px-4 py-2.5 bg-[#0A0A0B] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#F8FAFC] placeholder-[#7B8291] focus:outline-none focus:border-[#FF2D2D] transition-colors resize-none"
            />
          </div>

          {/* Foods */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-[#F8FAFC]">
                Alimentos *
              </label>
              <button
                onClick={addFood}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#FF2D2D] hover:bg-[#FF4444] text-white text-sm rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Añadir Alimento
              </button>
            </div>

            <div className="space-y-3">
              {foods.map((food, index) => (
                <div key={index} className="bg-[#0A0A0B] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[#F8FAFC]">Alimento {index + 1}</h4>
                    <button
                      onClick={() => removeFood(index)}
                      className="p-1.5 rounded-lg hover:bg-[#1A1D24] transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-[#EF4444]" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#A7AFBE] mb-1.5">Nombre *</label>
                      <input
                        type="text"
                        value={food.name}
                        onChange={(e) => updateFood(index, 'name', e.target.value)}
                        placeholder="Ej: Pollo, Arroz..."
                        className="w-full px-3 py-2 bg-[#14161B] border border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#F8FAFC] placeholder-[#7B8291] focus:outline-none focus:border-[#FF2D2D] transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-[#A7AFBE] mb-1.5">Cantidad *</label>
                        <input
                          type="number"
                          value={food.quantity || ''}
                          onChange={(e) => updateFood(index, 'quantity', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-3 py-2 bg-[#14161B] border border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF2D2D] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#A7AFBE] mb-1.5">Unidad *</label>
                        <select
                          value={food.unit}
                          onChange={(e) => updateFood(index, 'unit', e.target.value)}
                          className="w-full px-3 py-2 bg-[#14161B] border border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF2D2D] transition-colors"
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="unidad">unidad</option>
                          <option value="unidades">unidades</option>
                          <option value="cucharada">cucharada</option>
                          <option value="cucharadas">cucharadas</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-[#A7AFBE] mb-1.5">Calorías</label>
                      <input
                        type="number"
                        value={food.calories || ''}
                        onChange={(e) => updateFood(index, 'calories', parseFloat(e.target.value) || undefined)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-[#14161B] border border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF2D2D] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#A7AFBE] mb-1.5">Proteína (g)</label>
                      <input
                        type="number"
                        value={food.protein || ''}
                        onChange={(e) => updateFood(index, 'protein', parseFloat(e.target.value) || undefined)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-[#14161B] border border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF2D2D] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#A7AFBE] mb-1.5">Carbs (g)</label>
                      <input
                        type="number"
                        value={food.carbs || ''}
                        onChange={(e) => updateFood(index, 'carbs', parseFloat(e.target.value) || undefined)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-[#14161B] border border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF2D2D] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#A7AFBE] mb-1.5">Grasas (g)</label>
                      <input
                        type="number"
                        value={food.fats || ''}
                        onChange={(e) => updateFood(index, 'fats', parseFloat(e.target.value) || undefined)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-[#14161B] border border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FF2D2D] transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {foods.length === 0 && (
                <div className="text-center py-8 border border-dashed border-[rgba(255,255,255,0.1)] rounded-lg">
                  <p className="text-sm text-[#A7AFBE]">No hay alimentos añadidos</p>
                  <p className="text-xs text-[#7B8291] mt-1">Haz clic en "Añadir Alimento" para comenzar</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[rgba(255,255,255,0.08)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#A7AFBE] hover:text-[#F8FAFC] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#FF2D2D] hover:bg-[#FF4444] text-white text-sm font-medium rounded-lg transition-colors"
          >
            {existingMeal ? 'Guardar Cambios' : 'Añadir Comida'}
          </button>
        </div>
      </div>
    </div>
  )
}

