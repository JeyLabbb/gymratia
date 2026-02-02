'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Dumbbell, UtensilsCrossed, Upload, FileText, CheckCircle2, ArrowRight, Plus, X, Users } from 'lucide-react'

type WorkoutTemplate = {
  id: string
  title: string
  description: string
  workout_data: any
  target_goals: string[]
  intensity_level: number
}

type DietTemplate = {
  id: string
  title: string
  description: string
  diet_data: any
  target_goals: string[]
  daily_calories: number
  daily_protein_g: number
  daily_carbs_g: number
  daily_fats_g: number
}

function TrainerOnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const trainerId = searchParams.get('trainerId')
  const { user } = useAuth()
  const [step, setStep] = useState<'welcome' | 'workouts' | 'diets' | 'complete'>('welcome')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [trainer, setTrainer] = useState<any>(null)

  useEffect(() => {
    // No redirect: show landing for unauthenticated (SEO-friendly, indexable)
    if (!user) return

    // Cargar información del entrenador
    if (trainerId) {
      loadTrainer()
    } else {
      // Buscar trainer por user_id
      supabase
        .from('trainers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error cargando trainer:', error)
            setError('Error al cargar tu perfil de entrenador')
          } else if (data) {
            setTrainer(data)
          } else {
            // No tiene perfil, redirigir a registro
            router.push('/trainers/register?step=2')
          }
        })
    }
  }, [user, trainerId, router])

  const loadTrainer = async () => {
    const { data, error } = await supabase
      .from('trainers')
      .select('*')
      .eq('id', trainerId)
      .single()

    if (error) {
      setError('Error al cargar tu perfil de entrenador')
    } else {
      setTrainer(data)
    }
  }

  const handleComplete = () => {
    router.push('/trainers/dashboard')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#050509] via-[#050509] to-[#0A0A0B]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#F8FAFC] mb-4">
            Configura tu IA de entrenador
          </h1>
          <p className="text-lg text-[#A7AFBE] mb-8 max-w-2xl mx-auto">
            Añade entrenamientos y dietas personalizados que alimentarán a tu entrenador virtual. 
            Define tu metodología, crea contenido para tus alumnos y haz crecer tu marca como entrenador.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href={`/auth/login?redirect=${encodeURIComponent('/trainers/onboarding')}`}
              className="inline-flex items-center gap-2 rounded-[18px] bg-[#FF2D2D] px-6 py-3 text-base font-semibold text-white hover:bg-[#FF3D3D] transition-colors"
            >
              Iniciar sesión para continuar
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/trainers/register"
              className="inline-flex items-center gap-2 rounded-[18px] border border-[rgba(255,255,255,0.24)] px-6 py-3 text-base font-medium text-[#F8FAFC] hover:border-[#FF2D2D]/50 transition-colors"
            >
              Registrarse como entrenador
            </Link>
          </div>
          <p className="mt-8 text-sm text-[#7B8291]">
            ¿Aún no tienes cuenta de entrenador? <Link href="/trainers/register" className="text-[#FF2D2D] hover:underline">Regístrate aquí</Link>
          </p>
        </div>
      </div>
    )
  }

  if (!trainer && !trainerId) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-[#F8FAFC]">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050509] via-[#050509] to-[#0A0A0B]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#F8FAFC] mb-2">
            ¡Bienvenido, {trainer?.trainer_name || 'Entrenador'}!
          </h1>
          <p className="text-sm text-[#A7AFBE]">
            Completa tu perfil añadiendo contenido para tus alumnos
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`flex items-center gap-2 ${step === 'welcome' ? 'text-[#FF2D2D]' : 'text-[#22C55E]'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step === 'welcome' 
                ? 'bg-[#FF2D2D] border-[#FF2D2D] text-white' 
                : 'bg-[#22C55E] border-[#22C55E] text-white'
            }`}>
              {step !== 'welcome' ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <span className="text-xs font-medium hidden sm:inline">Bienvenida</span>
          </div>
          <div className={`w-12 h-0.5 ${step !== 'welcome' ? 'bg-[#22C55E]' : 'bg-[#6B7280]'}`} />
          <div className={`flex items-center gap-2 ${step === 'workouts' ? 'text-[#FF2D2D]' : step === 'diets' || step === 'complete' ? 'text-[#22C55E]' : 'text-[#6B7280]'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step === 'workouts'
                ? 'bg-[#FF2D2D] border-[#FF2D2D] text-white'
                : step === 'diets' || step === 'complete'
                ? 'bg-[#22C55E] border-[#22C55E] text-white'
                : 'border-[#6B7280] text-[#6B7280]'
            }`}>
              {step === 'diets' || step === 'complete' ? <CheckCircle2 className="w-4 h-4" /> : '2'}
            </div>
            <span className="text-xs font-medium hidden sm:inline">Entrenamientos</span>
          </div>
          <div className={`w-12 h-0.5 ${step === 'diets' || step === 'complete' ? 'bg-[#22C55E]' : 'bg-[#6B7280]'}`} />
          <div className={`flex items-center gap-2 ${step === 'diets' ? 'text-[#FF2D2D]' : step === 'complete' ? 'text-[#22C55E]' : 'text-[#6B7280]'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step === 'diets'
                ? 'bg-[#FF2D2D] border-[#FF2D2D] text-white'
                : step === 'complete'
                ? 'bg-[#22C55E] border-[#22C55E] text-white'
                : 'border-[#6B7280] text-[#6B7280]'
            }`}>
              {step === 'complete' ? <CheckCircle2 className="w-4 h-4" /> : '3'}
            </div>
            <span className="text-xs font-medium hidden sm:inline">Dietas</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {step === 'welcome' && (
          <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-8 text-center">
            <h2 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-4">
              ¡Tu cuenta de entrenador está lista!
            </h2>
            <p className="text-sm text-[#A7AFBE] mb-8 max-w-2xl mx-auto">
              Ahora puedes empezar a crear contenido para tus alumnos. Añade entrenamientos y dietas 
              que estarán disponibles para ellos. Puedes hacerlo ahora o más tarde desde tu dashboard.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              <div className="rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] p-4">
                <Dumbbell className="w-6 h-6 text-[#FF2D2D] mx-auto mb-2" />
                <p className="text-xs text-[#A7AFBE]">Crea entrenamientos</p>
              </div>
              <div className="rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] p-4">
                <UtensilsCrossed className="w-6 h-6 text-[#22C55E] mx-auto mb-2" />
                <p className="text-xs text-[#A7AFBE]">Crea dietas</p>
              </div>
              <div className="rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] p-4">
                <Users className="w-6 h-6 text-[#38BDF8] mx-auto mb-2" />
                <p className="text-xs text-[#A7AFBE]">Gestiona alumnos</p>
              </div>
            </div>
            <button
              onClick={() => setStep('workouts')}
              className="inline-flex items-center gap-2 rounded-[18px] bg-[#FF2D2D] px-6 py-3 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors"
            >
              Empezar a crear contenido
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="mt-4">
              <button
                onClick={handleComplete}
                className="text-sm text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors"
              >
                O hacerlo más tarde
              </button>
            </div>
          </div>
        )}

        {step === 'workouts' && (
          <WorkoutCreationStep 
            trainerId={trainer?.id || trainerId || ''}
            trainerSlug={trainer?.slug || ''}
            onComplete={() => setStep('diets')}
            onSkip={() => setStep('diets')}
          />
        )}

        {step === 'diets' && (
          <DietCreationStep 
            trainerId={trainer?.id || trainerId || ''}
            trainerSlug={trainer?.slug || ''}
            onComplete={() => setStep('complete')}
            onSkip={() => setStep('complete')}
          />
        )}

        {step === 'complete' && (
          <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-[#22C55E] mx-auto mb-4" />
            <h2 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-4">
              ¡Todo listo!
            </h2>
            <p className="text-sm text-[#A7AFBE] mb-8 max-w-2xl mx-auto">
              Ya puedes empezar a usar tu dashboard de entrenador. Podrás añadir más contenido, 
              gestionar alumnos y ver estadísticas en cualquier momento.
            </p>
            <button
              onClick={handleComplete}
              className="inline-flex items-center gap-2 rounded-[18px] bg-[#FF2D2D] px-6 py-3 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors"
            >
              Ir a mi dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Componente para crear entrenamientos
function WorkoutCreationStep({ 
  trainerId, 
  trainerSlug, 
  onComplete, 
  onSkip 
}: { 
  trainerId: string
  trainerSlug: string
  onComplete: () => void
  onSkip: () => void
}) {
  const [workouts, setWorkouts] = useState<WorkoutTemplate[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_goals: [] as string[],
    intensity_level: 5,
    experience_level: 'intermedio' as 'principiante' | 'intermedio' | 'avanzado'
  })

  const handleCreateWorkout = async () => {
    if (!formData.title) {
      alert('El título es requerido')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No hay sesión')

      // Crear estructura básica de workout
      const workoutData = {
        days: [] // El entrenador puede añadir días después
      }

      const response = await fetch('/api/trainer/workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          trainerId,
          trainerSlug,
          title: formData.title,
          description: formData.description,
          workout_data: workoutData,
          target_goals: formData.target_goals,
          intensity_level: formData.intensity_level,
          experience_level: formData.experience_level
        })
      })

      if (!response.ok) {
        throw new Error('Error al crear el entrenamiento')
      }

      const { workout } = await response.json()
      setWorkouts([...workouts, workout])
      setFormData({
        title: '',
        description: '',
        target_goals: [],
        intensity_level: 5,
        experience_level: 'intermedio'
      })
      setShowForm(false)
    } catch (err: any) {
      console.error('Error:', err)
      alert(err.message || 'Error al crear el entrenamiento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-bold text-[#F8FAFC] mb-2 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-[#FF2D2D]" />
            Crea tu primer entrenamiento
          </h2>
          <p className="text-sm text-[#A7AFBE]">
            Añade plantillas de entrenamiento que tus alumnos podrán usar
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-[16px] bg-[#FF2D2D] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF3D3D] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo entrenamiento
          </button>
        )}
      </div>

      {showForm ? (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Título del entrenamiento</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
              placeholder="Ej: PPL 4 días, Full Body 3 días..."
            />
          </div>
          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] min-h-[80px] resize-none"
              placeholder="Describe el entrenamiento..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreateWorkout}
              disabled={loading}
              className="flex-1 rounded-[16px] bg-[#FF2D2D] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF3D3D] transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear entrenamiento'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-[#A7AFBE] hover:text-[#F8FAFC] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {workouts.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-[#A7AFBE] mb-3">Entrenamientos creados:</p>
          <div className="space-y-2">
            {workouts.map((w) => (
              <div key={w.id} className="rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] p-4">
                <p className="font-medium text-[#F8FAFC]">{w.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
        <button
          onClick={onSkip}
          className="flex-1 rounded-[16px] bg-transparent border border-[rgba(255,255,255,0.24)] text-[#F8FAFC] px-4 py-2 text-sm font-medium hover:border-[#FF2D2D]/70 transition-colors"
        >
          Saltar por ahora
        </button>
        <button
          onClick={onComplete}
          className="flex-1 rounded-[16px] bg-[#FF2D2D] text-white px-4 py-2 text-sm font-semibold hover:bg-[#FF3D3D] transition-colors flex items-center justify-center gap-2"
        >
          Continuar
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Componente para crear dietas
function DietCreationStep({ 
  trainerId, 
  trainerSlug, 
  onComplete, 
  onSkip 
}: { 
  trainerId: string
  trainerSlug: string
  onComplete: () => void
  onSkip: () => void
}) {
  const [diets, setDiets] = useState<DietTemplate[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_goals: [] as string[],
    daily_calories: '',
    daily_protein_g: '',
    daily_carbs_g: '',
    daily_fats_g: ''
  })

  const handleCreateDiet = async () => {
    if (!formData.title) {
      alert('El título es requerido')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No hay sesión')

      // Crear estructura básica de dieta
      const dietData = {
        rules: [],
        allowed_foods: {
          proteins: [],
          carbs: [],
          fats: [],
          vegetables: [],
          fruits: [],
          beverages: [],
          snacks: []
        },
        controlled_foods: [],
        prohibited_foods: [],
        meal_examples: {}
      }

      const response = await fetch('/api/trainer/diet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          trainerId,
          trainerSlug,
          title: formData.title,
          description: formData.description,
          diet_data: dietData,
          target_goals: formData.target_goals,
          daily_calories: formData.daily_calories ? Number(formData.daily_calories) : null,
          daily_protein_g: formData.daily_protein_g ? Number(formData.daily_protein_g) : null,
          daily_carbs_g: formData.daily_carbs_g ? Number(formData.daily_carbs_g) : null,
          daily_fats_g: formData.daily_fats_g ? Number(formData.daily_fats_g) : null
        })
      })

      if (!response.ok) {
        throw new Error('Error al crear la dieta')
      }

      const { diet } = await response.json()
      setDiets([...diets, diet])
      setFormData({
        title: '',
        description: '',
        target_goals: [],
        daily_calories: '',
        daily_protein_g: '',
        daily_carbs_g: '',
        daily_fats_g: ''
      })
      setShowForm(false)
    } catch (err: any) {
      console.error('Error:', err)
      alert(err.message || 'Error al crear la dieta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-bold text-[#F8FAFC] mb-2 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-[#22C55E]" />
            Crea tu primera dieta
          </h2>
          <p className="text-sm text-[#A7AFBE]">
            Añade plantillas de dieta que tus alumnos podrán usar
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-[16px] bg-[#22C55E] px-4 py-2 text-sm font-medium text-white hover:bg-[#2DD66F] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva dieta
          </button>
        )}
      </div>

      {showForm ? (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Título de la dieta</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
              placeholder="Ej: Dieta para ganar músculo, Dieta para perder grasa..."
            />
          </div>
          <div>
            <label className="block text-sm text-[#A7AFBE] mb-2">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] min-h-[80px] resize-none"
              placeholder="Describe la dieta..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreateDiet}
              disabled={loading}
              className="flex-1 rounded-[16px] bg-[#22C55E] px-4 py-2 text-sm font-medium text-white hover:bg-[#2DD66F] transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear dieta'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-[#A7AFBE] hover:text-[#F8FAFC] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {diets.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-[#A7AFBE] mb-3">Dietas creadas:</p>
          <div className="space-y-2">
            {diets.map((d) => (
              <div key={d.id} className="rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] p-4">
                <p className="font-medium text-[#F8FAFC]">{d.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
        <button
          onClick={onSkip}
          className="flex-1 rounded-[16px] bg-transparent border border-[rgba(255,255,255,0.24)] text-[#F8FAFC] px-4 py-2 text-sm font-medium hover:border-[#FF2D2D]/70 transition-colors"
        >
          Saltar por ahora
        </button>
        <button
          onClick={onComplete}
          className="flex-1 rounded-[16px] bg-[#FF2D2D] text-white px-4 py-2 text-sm font-semibold hover:bg-[#FF3D3D] transition-colors flex items-center justify-center gap-2"
        >
          Finalizar
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function TrainerOnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center"><div className="text-[#F8FAFC]">Cargando...</div></div>}>
      <TrainerOnboardingContent />
    </Suspense>
  )
}

