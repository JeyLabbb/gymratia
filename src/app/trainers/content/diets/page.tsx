'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Plus, UtensilsCrossed, Edit2, Trash2, FileText } from 'lucide-react'

export default function TrainerDietsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [trainer, setTrainer] = useState<any>(null)
  const [diets, setDiets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    diet_data: '',
    target_goals: [] as string[]
  })

  // Cargar datos guardados de localStorage al montar
  useEffect(() => {
    if (typeof window !== 'undefined' && !editingId) {
      const savedData = localStorage.getItem('trainer_diet_form_data')
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          setFormData(parsed)
        } catch (e) {
          console.error('Error parsing saved form data:', e)
        }
      }
    }
  }, [editingId])

  // Guardar datos en localStorage cuando cambien
  useEffect(() => {
    if (typeof window !== 'undefined' && !editingId) {
      localStorage.setItem('trainer_diet_form_data', JSON.stringify(formData))
    }
  }, [formData, editingId])

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

      // Cargar diets
      const { data: dietsData } = await supabase
        .from('trainer_diets')
        .select('*')
        .eq('trainer_id', trainerData.id)
        .order('created_at', { ascending: false })

      setDiets(dietsData || [])
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

      let dietData
      try {
        dietData = JSON.parse(formData.diet_data)
      } catch {
        dietData = { content: formData.diet_data }
      }

      const updateData: any = {
        title: formData.title,
        description: formData.description,
        diet_data: dietData,
        target_goals: formData.target_goals
      }

      if (editingId) {
        // Actualizar
        const { error } = await supabase
          .from('trainer_diets')
          .update(updateData)
          .eq('id', editingId)
          .eq('trainer_id', trainer.id)

        if (error) throw error
      } else {
        // Crear
        const { error } = await supabase
          .from('trainer_diets')
          .insert({
            trainer_id: trainer.id,
            trainer_slug: trainer.slug,
            ...updateData
          })

        if (error) throw error
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        diet_data: '',
        target_goals: []
      })
      setEditingId(null)
      // Limpiar localStorage al guardar exitosamente
      if (typeof window !== 'undefined') {
        localStorage.removeItem('trainer_diet_form_data')
      }
      loadData()
    } catch (err: any) {
      console.error('Error guardando:', err)
      alert('Error al guardar: ' + err.message)
    }
  }

  const handleEdit = (diet: any) => {
    setEditingId(diet.id)
    setFormData({
      title: diet.title || '',
      description: diet.description || '',
      diet_data: typeof diet.diet_data === 'string' 
        ? diet.diet_data 
        : JSON.stringify(diet.diet_data, null, 2),
      target_goals: diet.target_goals || []
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta dieta?')) return

    try {
      const { error } = await supabase
        .from('trainer_diets')
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
    <div className="min-h-screen bg-gradient-to-b from-[#050509] via-[#050509] to-[#0A0A0B]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/trainers/dashboard"
            className="inline-flex items-center gap-2 text-sm text-[#9CA3AF] hover:text-[#F8FAFC] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Link>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#F8FAFC] mb-2">
            Define tu enfoque nutricional
          </h1>
          <p className="text-sm text-[#A7AFBE]">
            Alimenta a tu IA con tu estilo. Puedes escribir esto con ChatGPT y pegarlo aquí.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-6 mb-8">
          <h2 className="font-heading text-lg font-bold text-[#F8FAFC] mb-4 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-[#22C55E]" />
            {editingId ? 'Editar dieta' : 'Nueva dieta'}
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
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                placeholder="Ej: Dieta para ganar músculo"
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
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                placeholder="Breve descripción"
              />
            </div>

            <div>
              <label className="block text-sm text-[#A7AFBE] mb-2">
                Estructura completa de la dieta <span className="text-[#FF2D2D]">*</span>
              </label>
              <textarea
                value={formData.diet_data}
                onChange={(e) => setFormData({ ...formData, diet_data: e.target.value })}
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#22C55E] min-h-[400px] resize-none font-mono text-sm"
                placeholder={`{
  "macros_generales": {
    "descripcion": "Rangos generales de macros según objetivos (ej: pérdida de grasa, ganancia muscular)",
    "proteina_por_kg": "1.6-2.2g por kg de peso corporal",
    "carbohidratos_por_kg": "3-5g por kg de peso corporal",
    "grasas_por_kg": "0.8-1.2g por kg de peso corporal"
  },
  "macros_concretos": {
    "descripcion": "Macros específicos para diferentes situaciones",
    "dias_entrenamiento": {
      "proteina": "2g/kg",
      "carbohidratos": "5g/kg",
      "grasas": "1g/kg"
    },
    "dias_descanso": {
      "proteina": "2g/kg",
      "carbohidratos": "3g/kg",
      "grasas": "1.2g/kg"
    }
  },
  "alimentos_permitidos": [
    "Pollo, pavo, pescado blanco",
    "Arroz integral, avena, quinoa",
    "Verduras de hoja verde",
    "Aceite de oliva virgen extra (medido)"
  ],
  "alimentos_controlar": [
    {
      "nombre": "Fruta",
      "cantidad_maxima": "2-3 porciones al día",
      "momento": "Preferiblemente por la mañana o post-entreno"
    },
    {
      "nombre": "Frutos secos",
      "cantidad_maxima": "30g al día",
      "notas": "Por su alta densidad calórica"
    }
  ],
  "alimentos_prohibidos": [
    "Azúcar refinado y productos ultraprocesados",
    "Bebidas azucaradas y alcohol",
    "Fritos y comida rápida",
    "Aceites vegetales refinados (excepto AOVE)"
  ],
  "recomendaciones_generales": [
    "Beber mínimo 2.5-3L de agua al día",
    "No usar aceite para cocinar, solo para aliñar (medido)",
    "Cocinar al vapor, horno o plancha",
    "Comer cada 3-4 horas para mantener el metabolismo activo",
    "Proteína en cada comida (mínimo 30g)",
    "Verduras en cada comida principal",
    "Carbohidratos complejos en desayuno y post-entreno"
  ],
  "distribucion_diaria": {
    "desayuno": "Proteína + carbohidratos complejos + grasas saludables",
    "media_manana": "Proteína ligera o fruta",
    "almuerzo": "Proteína + carbohidratos + verduras",
    "merienda": "Proteína + carbohidratos (si hay entrenamiento)",
    "cena": "Proteína + verduras + grasas saludables"
  },
  "timing_nutricional": {
    "pre_entreno": "Carbohidratos 30-60min antes",
    "post_entreno": "Proteína + carbohidratos en ventana de 2 horas",
    "antes_dormir": "Proteína de digestión lenta (caseína) opcional"
  },
  "organizacion_diaria": {
    "morning": "Desayuno rico en proteína y carbohidratos complejos para activar el metabolismo",
    "pre_workout": "Carbohidratos simples 30-60min antes del entrenamiento para energía",
    "post_workout": "Proteína + carbohidratos en ventana de 2 horas para recuperación",
    "evening": "Cena ligera con proteína y verduras, evitar carbohidratos complejos",
    "general_guidelines": "Comer cada 3-4 horas, proteína en cada comida, hidratación constante"
  },
  "recomendaciones": {
    "water": "Mínimo 2.5-3L de agua al día, aumentar en días de entrenamiento",
    "supplements": ["Proteína en polvo post-entreno", "Creatina 5g diarios", "Multivitamínico"],
    "timing": "Ventana anabólica post-entreno: 2 horas para optimizar recuperación",
    "other": ["Dormir 7-9 horas para optimizar recuperación", "Evitar alcohol que interfiere con la síntesis proteica"]
  },
  "notas_adicionales": "Cualquier detalle adicional que consideres importante para estructurar perfectamente la dieta"
}`}
              />
              <div className="mt-3 p-4 rounded-[12px] bg-[#0A0A0B] border border-[rgba(255,255,255,0.05)]">
                <p className="text-xs font-semibold text-[#F8FAFC] mb-2">📋 Qué incluir en el JSON:</p>
                <ul className="text-xs text-[#A7AFBE] space-y-1.5 list-disc list-inside">
                  <li><span className="font-medium text-[#E5E7EB]">Macros generales y concretos:</span> Rangos según objetivos y macros específicos para días de entrenamiento/descanso</li>
                  <li><span className="font-medium text-[#E5E7EB]">Alimentos permitidos:</span> Lista de alimentos que recomiendas sin restricción</li>
                  <li><span className="font-medium text-[#E5E7EB]">Alimentos a controlar:</span> Alimentos permitidos pero con límites de cantidad o momento del día</li>
                  <li><span className="font-medium text-[#E5E7EB]">Alimentos prohibidos:</span> Alimentos que no deben consumirse</li>
                  <li><span className="font-medium text-[#E5E7EB]">Recomendaciones generales:</span> Reglas como beber agua, no usar aceite, métodos de cocción, frecuencia de comidas, etc.</li>
                  <li><span className="font-medium text-[#E5E7EB]">Distribución diaria:</span> Qué incluir en cada comida del día</li>
                  <li><span className="font-medium text-[#E5E7EB]">Timing nutricional:</span> Cuándo consumir nutrientes en relación al entrenamiento</li>
                  <li><span className="font-medium text-[#E5E7EB]">Organización diaria:</span> <span className="text-[#22C55E]">⚠️ IMPORTANTE</span> Incluye recomendaciones para mañana, pre-entrenamiento, post-entrenamiento, noche y guías generales. Esto ayudará a la IA a crear dietas más completas.</li>
                  <li><span className="font-medium text-[#E5E7EB]">Recomendaciones:</span> <span className="text-[#22C55E]">⚠️ IMPORTANTE</span> Incluye recomendaciones sobre agua, suplementos, timing y otras recomendaciones adicionales. Esto ayudará a la IA a completar las dietas con toda la información necesaria.</li>
                  <li><span className="font-medium text-[#E5E7EB]">Notas adicionales:</span> Cualquier detalle que consideres importante</li>
                </ul>
                <p className="text-xs text-[#6B7280] mt-3">
                  💡 Tip: Puedes escribir esto con ChatGPT ("describe mi enfoque nutricional completo en formato JSON") y pegarlo aquí. El JSON debe ser válido.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={!formData.title || !formData.diet_data}
                className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#22C55E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#16A34A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      diet_data: '',
                      target_goals: []
                    })
                  }}
                  className="inline-flex items-center justify-center rounded-[18px] bg-transparent border border-[rgba(255,255,255,0.24)] px-6 py-3 text-sm font-medium text-[#F8FAFC] hover:border-[#22C55E]/70 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de dietas */}
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-[#F8FAFC] mb-4">
            Tus dietas ({diets.length})
          </h2>

          {diets.length === 0 ? (
            <div className="rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-8 text-center">
              <FileText className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
              <p className="text-[#A7AFBE] mb-2">Aún no has definido tu enfoque nutricional</p>
              <p className="text-sm text-[#6B7280]">Usa el formulario de arriba para añadir tu primera dieta</p>
            </div>
          ) : (
            diets.map((diet) => (
              <div
                key={diet.id}
                className="rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-heading text-lg font-bold text-[#F8FAFC] mb-2">
                      {diet.title}
                    </h3>
                    {diet.description && (
                      <p className="text-sm text-[#A7AFBE] mb-3">{diet.description}</p>
                    )}
                    {diet.diet_data && (
                      <div className="text-xs text-[#6B7280] mt-2">
                        <span className="text-[#9CA3AF]">Estructura completa definida</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(diet)}
                      className="p-2 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#A7AFBE] hover:text-[#F8FAFC] hover:border-[#22C55E]/50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(diet.id)}
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

