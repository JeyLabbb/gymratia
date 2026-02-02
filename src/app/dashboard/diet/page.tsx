'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { DashboardLayout } from '@/app/_components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { 
  UtensilsCrossed, 
  Plus, 
  Calendar,
  MessageSquare,
  ArrowRight,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { personas, getTrainerBySlug } from '@/lib/personas'
import { DietView } from '@/app/_components/DietView'
import { MealPlanCalendar } from '@/app/_components/MealPlanCalendar'
import { useToast, ToastContainer } from '@/app/_components/Toast'
import { LoadingScreen } from '@/app/_components/LoadingScreen'

type Diet = {
  id: string
  title: string
  description?: string
  start_date?: string
  end_date?: string
  daily_calories?: number
  daily_protein_g?: number
  daily_carbs_g?: number
  daily_fats_g?: number
  diet_data?: any
  is_active: boolean
  trainer_slug: string
  created_at: string
}

type MealPlanner = {
  id: string
  date: string
  meals: any[]
  total_calories?: number
  total_protein_g?: number
  total_carbs_g?: number
  total_fats_g?: number
  notes?: string
  trainer_slug: string
}

export default function DietPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [activeDiet, setActiveDiet] = useState<Diet | null>(null)
  const [diets, setDiets] = useState<Diet[]>([])
  const [mealPlanners, setMealPlanners] = useState<MealPlanner[]>([])
  const [selectedTrainer, setSelectedTrainer] = useState<'edu' | 'carolina' | null>(null)
  const [activeTrainerSlug, setActiveTrainerSlug] = useState<'edu' | 'carolina' | null>(null)
  const [activeTrainers, setActiveTrainers] = useState<Array<'edu' | 'carolina' | 'jey'>>([])
  const [mealPlanExpanded, setMealPlanExpanded] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadDietData()
      // Check if we should open diet panel from query params
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const openDiet = params.get('openDiet')
        const trainer = params.get('trainer') as 'edu' | 'carolina' | null
        if (openDiet === 'true' && trainer) {
          handleStartDietConversation(trainer)
        }
      }
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])

  // Reload diet data when window gains focus (in case diet was created in another tab/window)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        console.log('🔄 Window focused, reloading diet data...')
        loadDietData()
      }
    }
    window.addEventListener('focus', handleFocus)
    
    // Also listen for custom event when diet is created
    const handleDietCreated = () => {
      console.log('📢 Diet created event received, reloading...')
      loadDietData()
    }
    window.addEventListener('diet-created', handleDietCreated)
    
    // Listen for meal planner updates
    const handleMealPlanUpdated = () => {
      console.log('📢 Meal plan updated event received, reloading meal planners...')
      loadDietData()
    }
    window.addEventListener('meal-plan-updated', handleMealPlanUpdated)
    
    // Poll for meal plan updates every 5 seconds when page is visible
    // This ensures meal plans created by the agent in the chat appear in real-time
    let pollInterval: NodeJS.Timeout | null = null
    const startPolling = () => {
      if (user && document.visibilityState === 'visible') {
        pollInterval = setInterval(() => {
          if (document.visibilityState === 'visible' && user) {
            console.log('🔄 Polling for meal plan updates...')
            loadDietData()
          }
        }, 5000) // Poll every 5 seconds
      }
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startPolling()
        // Also reload immediately when page becomes visible
        if (user) {
          loadDietData()
        }
      } else {
        if (pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    startPolling() // Start polling immediately
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('diet-created', handleDietCreated)
      window.removeEventListener('meal-plan-updated', handleMealPlanUpdated)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [user])

  const loadDietData = async () => {
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

      const activeTrainersList: Array<'edu' | 'carolina' | 'jey'> = []
      if (chatsResponse.ok) {
        const chatsData = await chatsResponse.json()
        const chats = chatsData.chats || []
        chats.forEach((chat: any) => {
          // Solo incluir jey (carolina está deshabilitada)
          if (chat.trainer_slug === 'jey' || chat.trainer_slug === 'edu') {
            if (!activeTrainersList.includes('jey')) {
              activeTrainersList.push('jey')
            }
          }
        })
      }
      setActiveTrainers(activeTrainersList)

      // Load active diets
      const dietsResponse = await fetch('/api/diet?isActive=true', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (dietsResponse.ok) {
        const dietsData = await dietsResponse.json()
        const allDiets = dietsData.diets || []
        console.log('📋 Loaded diets from API:', {
          count: allDiets.length,
          diets: allDiets.map((d: Diet) => ({
            id: d.id,
            title: d.title,
            is_active: d.is_active,
            trainer_slug: d.trainer_slug,
            has_diet_data: !!d.diet_data,
            diet_data_keys: d.diet_data ? Object.keys(d.diet_data) : []
          }))
        })
        setDiets(allDiets)
        
        // Find active diet for current trainer or first active
        const active = allDiets.find((d: Diet) => d.is_active) || allDiets[0] || null
        if (active) {
          console.log('✅ Active diet found:', {
            id: active.id,
            title: active.title,
            trainer_slug: active.trainer_slug,
            has_diet_data: !!active.diet_data,
            diet_data_type: typeof active.diet_data,
            diet_data_keys: active.diet_data ? Object.keys(active.diet_data) : []
          })
          setActiveDiet(active)
          setActiveTrainerSlug(active.trainer_slug as 'edu' | 'carolina')
          
          // Load meal planners (past week to next 2 weeks to ensure we have all days)
          // Use the active diet's trainer slug that we just found
          const pastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          
          const mealPlannerUrl = `/api/meal-planner?startDate=${pastWeek}&endDate=${nextTwoWeeks}&trainerSlug=${active.trainer_slug}`
          
          const plannersResponse = await fetch(mealPlannerUrl, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })

          if (plannersResponse.ok) {
            const plannersData = await plannersResponse.json()
            setMealPlanners(plannersData.planners || [])
            console.log('✅ Loaded', plannersData.planners?.length || 0, 'meal planners for trainer:', active.trainer_slug)
          }
        } else {
          console.log('⚠️ No active diet found. Total diets:', allDiets.length)
          // If no active diet, still try to load meal planners without trainer filter
          const pastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          
          const mealPlannerUrl = `/api/meal-planner?startDate=${pastWeek}&endDate=${nextTwoWeeks}`
          
          const plannersResponse = await fetch(mealPlannerUrl, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })

          if (plannersResponse.ok) {
            const plannersData = await plannersResponse.json()
            setMealPlanners(plannersData.planners || [])
            console.log('✅ Loaded', plannersData.planners?.length || 0, 'meal planners (no trainer filter)')
          }
        }
      } else {
        const errorText = await dietsResponse.text()
        console.error('❌ Failed to load diets:', {
          status: dietsResponse.status,
          statusText: dietsResponse.statusText,
          error: errorText
        })
      }

    } catch (error) {
      console.error('Error loading diet data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartDietConversation = (trainerSlug: 'edu' | 'carolina') => {
    setSelectedTrainer(trainerSlug)
    // Navigate to chat with query param to open diet panel
    if (activeDiet) {
      router.push(`/dashboard/chat/${trainerSlug}?openDietPanel=true&dietId=${activeDiet.id}`)
    } else {
      router.push(`/dashboard/chat/${trainerSlug}?openDietPanel=true`)
    }
  }

  const getTrainerName = (slug: string) => {
    return personas.find(p => p.slug === slug)?.name || slug
  }

  if (authLoading || loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return null
  }

  const hasActiveDiet = activeDiet !== null

  return (
    <DashboardLayout activeSection="diet">
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          {/* Header - compact on mobile */}
          <div className="flex items-center justify-between mb-3 sm:mb-8">
            <div>
              <h2 className="font-heading text-lg sm:text-3xl font-bold text-[#F8FAFC] mb-0.5 sm:mb-2">Mi Dieta</h2>
              <p className="text-xs sm:text-base text-[#A7AFBE] hidden sm:block">Gestiona tu alimentación y planes de comidas</p>
            </div>
          </div>

          {!hasActiveDiet ? (
            /* Empty State - CTA to start */
            <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-6 sm:p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-[#FF2D2D]/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <UtensilsCrossed className="w-6 h-6 sm:w-10 sm:h-10 text-[#FF2D2D]" />
                </div>
                <h3 className="font-heading text-lg sm:text-2xl font-bold text-[#F8FAFC] mb-2 sm:mb-3">
                  Comienza a organizar tu dieta
                </h3>
                <p className="text-xs sm:text-base text-[#A7AFBE] mb-4 sm:mb-8">
                  Habla con tu entrenador para crear un plan nutricional personalizado.
                </p>
                
                {activeTrainers.length > 0 ? (
                  <div className={`grid ${activeTrainers.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-1 sm:grid-cols-2'} gap-3 sm:gap-4 mb-4 sm:mb-8`}>
                    {personas
                      .filter(trainer => activeTrainers.includes(trainer.slug as 'edu' | 'carolina' | 'jey'))
                      .map((trainer) => (
                        <button
                          key={trainer.slug}
                          onClick={() => handleStartDietConversation(trainer.slug as 'edu' | 'carolina')}
                          className="bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[16px] p-4 sm:p-6 hover:border-[#FF2D2D]/50 transition-all"
                        >
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-base sm:text-lg mx-auto mb-2 sm:mb-3">
                            {trainer.name[0]}
                          </div>
                          <h4 className="font-heading font-bold text-sm sm:text-base text-[#F8FAFC] mb-1">{trainer.name}</h4>
                          <p className="text-xs text-[#A7AFBE] mb-2 sm:mb-3 line-clamp-2">{trainer.headline}</p>
                          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-[#FF2D2D]">
                            <span>Empezar</span>
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                          </div>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[16px] p-4 sm:p-6 mb-4 sm:mb-8">
                    <p className="text-xs sm:text-sm text-[#A7AFBE] text-center">
                      No tienes chats activos. Ve a Chat para comenzar.
                    </p>
                  </div>
                )}

                <p className="text-xs text-[#7B8291] hidden sm:block">
                  Tu entrenador creará una dieta personalizada basada en tu perfil, objetivos y preferencias
                </p>
              </div>
            </div>
          ) : (
            /* Active Diet View */
            <div className="space-y-3 sm:space-y-6">
              {/* Active Diet Card - compact: one line title + hablar on mobile */}
              <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] p-3 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <h3 className="font-heading text-sm sm:text-xl font-bold text-[#F8FAFC] truncate">
                      {activeDiet.title}
                    </h3>
                    <span className="px-1.5 sm:px-3 py-0.5 rounded-full bg-[#FF2D2D]/10 text-[#FF2D2D] text-[10px] sm:text-xs font-medium flex-shrink-0">
                      Activa
                    </span>
                  </div>
                  <button
                    onClick={() => handleStartDietConversation(activeDiet.trainer_slug as 'edu' | 'carolina')}
                    className="flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-[10px] sm:rounded-[12px] bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] transition-colors text-[11px] sm:text-sm flex-shrink-0"
                  >
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Hablar con {getTrainerName(activeDiet.trainer_slug)}</span>
                    <span className="sm:hidden">Hablar</span>
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-[#7B8291] mb-3 sm:mb-4 -mt-1">
                  {getTrainerName(activeDiet.trainer_slug)}
                </p>

                <button
                  onClick={() => document.getElementById('plan-de-comidas')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-1.5 text-xs text-[#7B8291] hover:text-[#FF2D2D] transition-colors mb-3"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Ir al plan de comidas
                </button>

                {activeDiet.diet_data ? (
                  <DietView 
                    dietData={{
                      // Solo incluir campos válidos de diet_data
                      allowed_foods: activeDiet.diet_data.allowed_foods,
                      controlled_foods: activeDiet.diet_data.controlled_foods,
                      prohibited_foods: activeDiet.diet_data.prohibited_foods,
                      daily_organization: activeDiet.diet_data.daily_organization,
                      recommendations: activeDiet.diet_data.recommendations,
                      meals: activeDiet.diet_data.meals,
                      meal_plan: activeDiet.diet_data.meal_plan,
                      // Campos del nivel superior - asegurar que sean strings, no objetos
                      title: typeof activeDiet.title === 'string' ? activeDiet.title : (typeof activeDiet.title === 'object' ? JSON.stringify(activeDiet.title) : ''),
                      description: typeof activeDiet.description === 'string' ? activeDiet.description : (typeof activeDiet.description === 'object' ? JSON.stringify(activeDiet.description) : ''),
                      daily_calories: activeDiet.daily_calories || activeDiet.diet_data.daily_calories,
                      daily_protein: activeDiet.daily_protein_g || activeDiet.diet_data.daily_protein,
                      daily_carbs: activeDiet.daily_carbs_g || activeDiet.diet_data.daily_carbs,
                      daily_fats: activeDiet.daily_fats_g || activeDiet.diet_data.daily_fats,
                    }}
                    hideTitle={true}
                    editable={false}
                    activeTrainerSlug={activeTrainerSlug}
                    compactOnMobile={true}
                  />
                ) : (
                  <div className="bg-[#1A1D24] border border-[rgba(255,255,255,0.05)] rounded-[12px] p-6">
                    <p className="text-sm text-[#A7AFBE] text-center">
                      La dieta no tiene datos completos. Habla con tu entrenador para completarla.
                    </p>
                  </div>
                )}
              </div>

              <p className="text-xs text-[#7B8291] -mt-1 mb-2">
                Puedes modificar las comidas en el calendario o pedirle a tu entrenador que te lo cambie.
              </p>

              {/* Meal Planners - collapsible on mobile */}
              <div id="plan-de-comidas" className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[12px] sm:rounded-[22px] overflow-hidden scroll-mt-4">
                <button
                  onClick={() => setMealPlanExpanded(!mealPlanExpanded)}
                  className="flex md:hidden w-full items-center justify-between p-3 sm:p-4 text-left"
                >
                  <h3 className="font-heading text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#FF2D2D]" />
                    Ver plan de comidas
                  </h3>
                  {mealPlanExpanded ? <ChevronUp className="w-4 h-4 text-[#A7AFBE]" /> : <ChevronDown className="w-4 h-4 text-[#A7AFBE]" />}
                </button>
                <div className={mealPlanExpanded ? "block" : "hidden md:block"}>
                  <div className="hidden md:flex items-center justify-between p-4 pb-0 mb-2">
                    <h3 className="font-heading text-base sm:text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF2D2D]" />
                      Plan de Comidas Semanal
                    </h3>
                  </div>
                  <div className="p-3 sm:p-6 pt-0 sm:pt-0">
                <MealPlanCalendar
                  mealPlan={mealPlanners.map((p: MealPlanner) => ({
                    date: p.date,
                    meals: p.meals || [],
                    workoutTime: undefined,
                    workoutType: undefined
                  }))}
                  editable={true}
                  activeTrainerSlug={activeTrainerSlug}
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
                        
                        // Reload meal planners
                        loadDietData()
                      } catch (error) {
                        console.error('Error saving meal plan:', error)
                      }
                    }
                  }}
                />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </DashboardLayout>
  )
}
