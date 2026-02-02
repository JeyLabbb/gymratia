'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Plus, Dumbbell, Edit2, Trash2, FileText } from 'lucide-react'

export default function TrainerWorkoutsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [trainer, setTrainer] = useState<any>(null)
  const [workouts, setWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    workout_data: '',
    target_goals: [] as string[],
    intensity_level: 5,
    experience_level: 'intermedio'
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }

    if (user) {
      loadData()
    }
  }, [user, authLoading, router])

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Cargar trainer
      const { data: trainerData } = await supabase
        .from('trainers')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!trainerData) {
        router.push('/trainers/register?step=2')
        return
      }

      setTrainer(trainerData)

      // Cargar workouts
      const { data: workoutsData } = await supabase
        .from('trainer_workouts')
        .select('*')
        .eq('trainer_id', trainerData.id)
        .order('created_at', { ascending: false })

      setWorkouts(workoutsData || [])
    } catch (err) {
      console.error('Error cargando datos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!trainer) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      let workoutData
      try {
        workoutData = JSON.parse(formData.workout_data)
      } catch {
        workoutData = { content: formData.workout_data }
      }

      if (editingId) {
        // Actualizar
        const { error } = await supabase
          .from('trainer_workouts')
          .update({
            title: formData.title,
            description: formData.description,
            workout_data: workoutData,
            target_goals: formData.target_goals,
            intensity_level: formData.intensity_level,
            experience_level: formData.experience_level
          })
          .eq('id', editingId)
          .eq('trainer_id', trainer.id)

        if (error) throw error
      } else {
        // Crear
        const { error } = await supabase
          .from('trainer_workouts')
          .insert({
            trainer_id: trainer.id,
            trainer_slug: trainer.slug,
            title: formData.title,
            description: formData.description,
            workout_data: workoutData,
            target_goals: formData.target_goals,
            intensity_level: formData.intensity_level,
            experience_level: formData.experience_level
          })

        if (error) throw error
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        workout_data: '',
        target_goals: [],
        intensity_level: 5,
        experience_level: 'intermedio'
      })
      setEditingId(null)
      // Limpiar localStorage al guardar exitosamente
      if (typeof window !== 'undefined') {
        localStorage.removeItem('trainer_workout_form_data')
      }
      loadData()
    } catch (err: any) {
      console.error('Error guardando:', err)
      alert('Error al guardar: ' + err.message)
    }
  }

  const handleEdit = (workout: any) => {
    setEditingId(workout.id)
    setFormData({
      title: workout.title || '',
      description: workout.description || '',
      workout_data: typeof workout.workout_data === 'string' 
        ? workout.workout_data 
        : JSON.stringify(workout.workout_data, null, 2),
      target_goals: workout.target_goals || [],
      intensity_level: workout.intensity_level || 5,
      experience_level: workout.experience_level || 'intermedio'
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este entrenamiento?')) return

    try {
      const { error } = await supabase
        .from('trainer_workouts')
        .delete()
        .eq('id', id)
        .eq('trainer_id', trainer.id)

      if (error) throw error
      loadData()
    } catch (err: any) {
      console.error('Error eliminando:', err)
      alert('Error al eliminar: ' + err.message)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-[#F8FAFC]">Cargando...</div>
      </div>
    )
  }

  if (!trainer) {
    return null
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="mb-6">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#F8FAFC] mb-1">
            Define tu metodología de entrenamiento
          </h1>
          <p className="text-sm text-[#A7AFBE]">
            Alimenta a tu IA con tu estilo. Puedes escribir esto con ChatGPT y pegarlo aquí.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-6 mb-8">
          <h2 className="font-heading text-lg font-bold text-[#F8FAFC] mb-4 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-[#FF2D2D]" />
            {editingId ? 'Editar entrenamiento' : 'Nuevo entrenamiento'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#A7AFBE] mb-2">
                Título
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                placeholder="Ej: Rutina PPL para ganar músculo"
              />
            </div>

            <div>
              <label className="block text-sm text-[#A7AFBE] mb-2">
                Descripción
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                placeholder="Breve descripción"
              />
            </div>

            <div>
              <label className="block text-sm text-[#A7AFBE] mb-2">
                Estructura completa del entrenamiento <span className="text-[#FF2D2D]">*</span>
              </label>
              <textarea
                value={formData.workout_data}
                onChange={(e) => setFormData({ ...formData, workout_data: e.target.value })}
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] min-h-[400px] resize-none font-mono text-sm"
                placeholder={`{
  "estructura_semanal": {
    "descripcion": "Cómo organizas los días de entrenamiento",
    "tipo": "Push-Pull-Legs, Full Body, Upper-Lower, etc.",
    "dias_entrenamiento": ["Lunes", "Miércoles", "Viernes"],
    "dias_descanso": ["Martes", "Jueves", "Sábado", "Domingo"]
  },
  "dias": {
    "lunes": {
      "nombre": "Push (Empuje)",
      "ejercicios": [
        {
          "orden": 1,
          "nombre": "Press banca con barra",
          "series": 4,
          "reps": "6-8",
          "descanso": "3 minutos",
          "tempo": "2-1-2-0",
          "carga": "80-85% 1RM",
          "notas": "Primer ejercicio principal, calentar con 2 series de calentamiento"
        },
        {
          "orden": 2,
          "nombre": "Press inclinado con mancuernas",
          "series": 3,
          "reps": "8-10",
          "descanso": "90 segundos",
          "tempo": "2-1-2-0",
          "carga": "Moderada",
          "notas": "Enfocado en porción superior del pectoral"
        },
        {
          "orden": 3,
          "nombre": "Press militar",
          "series": 3,
          "reps": "8-12",
          "descanso": "90 segundos",
          "tempo": "2-1-2-0",
          "carga": "Moderada",
          "notas": "Desarrollo de hombros"
        },
        {
          "orden": 4,
          "nombre": "Extensiones de tríceps en polea",
          "series": 3,
          "reps": "12-15",
          "descanso": "60 segundos",
          "tempo": "1-0-2-0",
          "carga": "Ligera-moderada",
          "notas": "Ejercicio de aislamiento para tríceps"
        }
      ]
    },
    "miercoles": {
      "nombre": "Pull (Tirón)",
      "ejercicios": [
        {
          "orden": 1,
          "nombre": "Peso muerto",
          "series": 4,
          "reps": "5-6",
          "descanso": "4 minutos",
          "tempo": "1-0-2-0",
          "carga": "85-90% 1RM",
          "notas": "Ejercicio principal, usar cinturón si es necesario"
        },
        {
          "orden": 2,
          "nombre": "Dominadas",
          "series": 4,
          "reps": "Al fallo o 8-12",
          "descanso": "2 minutos",
          "tempo": "2-1-2-0",
          "carga": "Peso corporal o lastrado",
          "notas": "Si no puedes hacer 8, usar asistencia o negativas"
        },
        {
          "orden": 3,
          "nombre": "Remo con barra",
          "series": 3,
          "reps": "8-10",
          "descanso": "90 segundos",
          "tempo": "2-1-2-0",
          "carga": "Moderada",
          "notas": "Espalda media y romboides"
        },
        {
          "orden": 4,
          "nombre": "Curl de bíceps con barra",
          "series": 3,
          "reps": "10-12",
          "descanso": "60 segundos",
          "tempo": "1-0-2-0",
          "carga": "Ligera-moderada",
          "notas": "Ejercicio de aislamiento"
        }
      ]
    },
    "viernes": {
      "nombre": "Legs (Piernas)",
      "ejercicios": [
        {
          "orden": 1,
          "nombre": "Sentadilla con barra",
          "series": 4,
          "reps": "6-8",
          "descanso": "3-4 minutos",
          "tempo": "2-1-2-0",
          "carga": "80-85% 1RM",
          "notas": "Ejercicio principal, calentar bien antes"
        },
        {
          "orden": 2,
          "nombre": "Prensa de piernas",
          "series": 3,
          "reps": "10-12",
          "descanso": "90 segundos",
          "tempo": "2-1-2-0",
          "carga": "Moderada",
          "notas": "Complementario a sentadilla"
        },
        {
          "orden": 3,
          "nombre": "Extensiones de cuádriceps",
          "series": 3,
          "reps": "12-15",
          "descanso": "60 segundos",
          "tempo": "1-0-2-0",
          "carga": "Ligera-moderada",
          "notas": "Aislamiento de cuádriceps"
        },
        {
          "orden": 4,
          "nombre": "Curl de piernas tumbado",
          "series": 3,
          "reps": "10-12",
          "descanso": "60 segundos",
          "tempo": "2-1-2-0",
          "carga": "Moderada",
          "notas": "Aislamiento de isquiotibiales"
        }
      ]
    }
  },
  "series_recomendadas": {
    "fuerza": "3-5 series",
    "hipertrofia": "3-4 series",
    "resistencia": "2-3 series",
    "descripcion": "Rangos de series según el objetivo del ejercicio"
  },
  "reps_objetivo": {
    "fuerza": "1-6 repeticiones",
    "hipertrofia": "6-12 repeticiones",
    "resistencia": "12-20+ repeticiones",
    "descripcion": "Rangos de repeticiones según el objetivo"
  },
  "tiempo_descanso": {
    "fuerza": "3-5 minutos",
    "hipertrofia": "60-90 segundos",
    "resistencia": "30-60 segundos",
    "circuitos": "Descanso activo o mínimo entre ejercicios",
    "descripcion": "Tiempos de descanso recomendados según el tipo de entrenamiento"
  },
  "tempo": {
    "fuerza": "1-0-1-0 (concéntrica-explosiva, excéntrica-controlada)",
    "hipertrofia": "2-1-2-0 (concéntrica-controlada, pausa, excéntrica-controlada)",
    "resistencia": "1-0-1-0 (ritmo rápido y controlado)",
    "descripcion": "Tempo recomendado según el objetivo (concéntrica-pausa-excéntrica-pausa)"
  },
  "recomendaciones_generales": [
    "Calentar 5-10 minutos antes de entrenar",
    "Estirar después del entrenamiento",
    "Progresión semanal: aumentar peso 2.5-5kg o repeticiones +1-2",
    "Mantener técnica correcta antes que aumentar carga",
    "Descansar mínimo 48 horas entre entrenar el mismo grupo muscular",
    "Hidratarse durante el entrenamiento",
    "Usar cinturón para ejercicios pesados (sentadilla, peso muerto)"
  ],
  "progresion": {
    "semanal": "Aumentar peso 2.5-5kg o repeticiones +1-2",
    "mensual": "Revisar y ajustar volumen según adaptación",
    "descripcion": "Cómo progresar en el tiempo"
  },
  "notas_adicionales": "Cualquier detalle adicional que consideres importante para estructurar perfectamente el entrenamiento"
}`}
              />
              <div className="mt-3 p-4 rounded-[12px] bg-[#0A0A0B] border border-[rgba(255,255,255,0.05)]">
                <p className="text-xs font-semibold text-[#F8FAFC] mb-2">📋 Qué incluir en el JSON:</p>
                <ul className="text-xs text-[#A7AFBE] space-y-1.5 list-disc list-inside">
                  <li><span className="font-medium text-[#E5E7EB]">Estructura semanal:</span> Define qué días se entrena y qué días son descanso. Especifica el tipo de rutina (Push-Pull-Legs, Full Body, etc.)</li>
                  <li><span className="font-medium text-[#E5E7EB]">Ejercicios por día (recomendado):</span> Si lo tienes, puedes incluir los ejercicios detallados uno a uno, en orden, por cada día. Cada ejercicio puede tener: nombre, orden, series, reps, descanso, tempo, carga y notas.</li>
                  <li><span className="font-medium text-[#E5E7EB]">Series recomendadas:</span> Rangos de series según objetivo (fuerza, hipertrofia, resistencia)</li>
                  <li><span className="font-medium text-[#E5E7EB]">Reps objetivo:</span> Rangos de repeticiones según el tipo de entrenamiento</li>
                  <li><span className="font-medium text-[#E5E7EB]">Tiempo de descanso:</span> Tiempos de descanso entre series según intensidad y objetivo</li>
                  <li><span className="font-medium text-[#E5E7EB]">Tempo:</span> Velocidad de ejecución (concéntrica-pausa-excéntrica-pausa) según objetivo</li>
                  <li><span className="font-medium text-[#E5E7EB]">Recomendaciones generales:</span> Reglas como calentamiento, estiramiento, progresión, técnica, descanso, hidratación, etc.</li>
                  <li><span className="font-medium text-[#E5E7EB]">Progresión:</span> Cómo progresar semanal y mensualmente</li>
                  <li><span className="font-medium text-[#E5E7EB]">Notas adicionales:</span> Cualquier detalle que consideres importante</li>
                </ul>
                <p className="text-xs text-[#6B7280] mt-3">
                  💡 Tip: Puedes escribir esto con ChatGPT ("describe mi metodología de entrenamiento completo en formato JSON") y pegarlo aquí. El JSON debe ser válido. Si tienes ejercicios específicos detallados por día, puedes incluirlos, pero no es obligatorio.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={!formData.title || !formData.workout_data}
                className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#FF2D2D] px-6 py-3 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
              {editingId && (
                <button
                  onClick={() => {
                    setEditingId(null)
                    setFormData({
                      title: '',
                      description: '',
                      workout_data: '',
                      target_goals: [],
                      intensity_level: 5,
                      experience_level: 'intermedio'
                    })
                  }}
                  className="inline-flex items-center justify-center rounded-[18px] bg-transparent border border-[rgba(255,255,255,0.24)] px-6 py-3 text-sm font-medium text-[#F8FAFC] hover:border-[#FF2D2D]/70 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de entrenamientos */}
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-[#F8FAFC] mb-4">
            Tus entrenamientos ({workouts.length})
          </h2>

          {workouts.length === 0 ? (
            <div className="rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-8 text-center">
              <FileText className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
              <p className="text-[#A7AFBE] mb-2">Aún no has definido tu metodología</p>
              <p className="text-sm text-[#6B7280]">Usa el formulario de arriba para añadir tu primer entrenamiento</p>
            </div>
          ) : (
            workouts.map((workout) => (
              <div
                key={workout.id}
                className="rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-heading text-lg font-bold text-[#F8FAFC] mb-2">
                      {workout.title}
                    </h3>
                    {workout.description && (
                      <p className="text-sm text-[#A7AFBE] mb-3">{workout.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                      <span>Intensidad: {workout.intensity_level}/10</span>
                      <span>Nivel: {workout.experience_level}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(workout)}
                      className="p-2 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#A7AFBE] hover:text-[#F8FAFC] hover:border-[#FF2D2D]/50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(workout.id)}
                      className="p-2 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#A7AFBE] hover:text-[#FF2D2D] hover:border-[#FF2D2D]/50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

