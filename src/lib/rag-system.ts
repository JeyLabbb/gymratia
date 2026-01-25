/**
 * Sistema RAG (Retrieval-Augmented Generation) para Entrenadores IA
 * 
 * Este sistema permite que la IA del entrenador responda usando SOLO
 * el material que el entrenador ha subido, sin inventar contenido.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type ContentType = 'workout' | 'diet' | 'document' | 'video_transcript' | 'pdf_text'

export type TrainerContent = {
  id: string
  trainer_id: string
  content_type: ContentType
  source_id?: string
  raw_content: string
  structured_data: any
  tags: string[]
  target_goals: string[]
  intensity_level?: number
  experience_level?: string
  relevance_score?: number
}

export type SearchFilters = {
  contentType?: ContentType | 'all'
  targetGoal?: string
  intensity?: number
  experienceLevel?: string
  limit?: number
}

export type SafetyIssue = 'medical_condition' | 'eating_disorder' | 'injury' | 'extreme_behavior' | 'mental_health'

/**
 * Detecta situaciones sensibles en el mensaje del usuario
 */
export function detectSafetyIssues(message: string): SafetyIssue[] {
  const issues: SafetyIssue[] = []
  const lowerMessage = message.toLowerCase()

  const medicalKeywords = [
    'diabetes', 'hipertensión', 'hipertenso', 'cardiopatía', 'cardiaco',
    'problema de corazón', 'presión alta', 'colesterol'
  ]
  
  const injuryKeywords = [
    'lesión', 'lesionado', 'dolor', 'dolores', 'artritis',
    'osteoporosis', 'hernia', 'problema de espalda', 'rodilla',
    'hombro lesionado', 'codo', 'muñeca', 'tobillo', 'cadera'
  ]
  
  const eatingDisorderKeywords = [
    'anorexia', 'bulimia', 'trastorno alimentario',
    'no como', 'no como nada', 'vomito', 'purgas',
    'obsesión con la comida', 'miedo a engordar'
  ]
  
  const mentalHealthKeywords = [
    'depresión', 'ansiedad', 'estrés extremo', 'no puedo más',
    'quiero dejar', 'no tengo motivación', 'me siento mal'
  ]
  
  const extremeBehaviorKeywords = [
    'entreno 7 días', 'no descanso', 'entreno hasta caer',
    'como muy poco', 'hago mucho cardio', 'ayuno prolongado',
    'entreno todos los días'
  ]

  if (medicalKeywords.some(kw => lowerMessage.includes(kw))) {
    issues.push('medical_condition')
  }
  
  if (injuryKeywords.some(kw => lowerMessage.includes(kw))) {
    issues.push('injury')
  }
  
  if (eatingDisorderKeywords.some(kw => lowerMessage.includes(kw))) {
    issues.push('eating_disorder')
  }
  
  if (mentalHealthKeywords.some(kw => lowerMessage.includes(kw))) {
    issues.push('mental_health')
  }
  
  if (extremeBehaviorKeywords.some(kw => lowerMessage.includes(kw))) {
    issues.push('extreme_behavior')
  }

  return issues
}

/**
 * Genera respuesta de seguridad cuando se detectan situaciones sensibles
 */
export function generateSafetyResponse(issues: SafetyIssue[], userMessage: string): string {
  const baseMessage = `⚠️ AVISO IMPORTANTE

Lo que mencionas requiere atención de un profesional sanitario. 
Esta aplicación NO sustituye el asesoramiento médico, nutricional 
o de un entrenador personal certificado.

Te recomiendo:
• Consultar con un médico si mencionas condiciones de salud
• Consultar con un nutricionista si hay problemas alimentarios
• Consultar con un fisioterapeuta si hay lesiones o dolores

Puedo ayudarte con:
• Consejos generales de seguridad
• Modificaciones básicas del entrenamiento (si no hay lesión activa)
• Información general sobre nutrición

Pero NO puedo:
• Diagnosticar condiciones
• Prescribir tratamientos
• Sustituir atención profesional`

  if (issues.includes('medical_condition')) {
    return baseMessage + "\n\nPor favor, consulta con un médico antes de continuar con cualquier plan de entrenamiento o dieta."
  }
  
  if (issues.includes('eating_disorder')) {
    return baseMessage + "\n\nSi estás lidiando con un trastorno alimentario, es crucial que busques ayuda profesional. Puedo proporcionar información general, pero no puedo sustituir el tratamiento especializado."
  }
  
  if (issues.includes('injury')) {
    return baseMessage + "\n\nCon una lesión activa, es esencial que un fisioterapeuta o médico te dé el alta antes de entrenar. Puedo ayudarte a adaptar ejercicios una vez que tengas el visto bueno profesional."
  }
  
  if (issues.includes('extreme_behavior')) {
    return baseMessage + "\n\nLos comportamientos extremos (entrenar todos los días, comer muy poco, etc.) pueden ser peligrosos. Te recomiendo consultar con un profesional para diseñar un plan sostenible y seguro."
  }
  
  return baseMessage
}

/**
 * Analiza la intención del mensaje del usuario
 */
export function analyzeIntent(message: string): 'workout_request' | 'diet_request' | 'meal_plan_request' | 'food_question' | 'exercise_question' | 'progress_question' | 'general_chat' {
  const lowerMessage = message.toLowerCase()

  const workoutKeywords = [
    'entrenamiento', 'rutina', 'ejercicio', 'entreno', 'workout',
    'plan de entrenamiento', 'qué entrenar', 'hoy entrenar'
  ]
  
  const dietKeywords = [
    'dieta', 'alimentación', 'nutrición', 'qué comer', 'plan de dieta',
    'macros', 'calorías', 'proteína', 'carbohidratos'
  ]
  
  const mealPlanKeywords = [
    'plan de comidas', 'meal plan', 'comidas del día', 'qué desayunar',
    'qué cenar', 'organizar comidas', 'planificar comidas'
  ]
  
  const foodKeywords = [
    'puedo comer', 'está permitido', 'alimento', 'comida', 'snack'
  ]
  
  const exerciseKeywords = [
    'ejercicio', 'cómo hacer', 'técnica', 'form', 'ejecución'
  ]
  
  const progressKeywords = [
    'progreso', 'evolución', 'cómo voy', 'resultados', 'mejorar'
  ]

  if (workoutKeywords.some(kw => lowerMessage.includes(kw))) {
    return 'workout_request'
  }
  
  if (mealPlanKeywords.some(kw => lowerMessage.includes(kw))) {
    return 'meal_plan_request'
  }
  
  if (dietKeywords.some(kw => lowerMessage.includes(kw))) {
    return 'diet_request'
  }
  
  if (foodKeywords.some(kw => lowerMessage.includes(kw))) {
    return 'food_question'
  }
  
  if (exerciseKeywords.some(kw => lowerMessage.includes(kw))) {
    return 'exercise_question'
  }
  
  if (progressKeywords.some(kw => lowerMessage.includes(kw))) {
    return 'progress_question'
  }

  return 'general_chat'
}

/**
 * Busca contenido relevante en la biblioteca del entrenador
 * Por ahora usa búsqueda por texto, luego se puede mejorar con embeddings
 * 
 * NOTA: Esta función busca por trainer_slug porque las tablas actuales usan slug.
 * Cuando se migre a trainer_content_library, se buscará por trainer_id.
 */
export async function searchTrainerLibrary(
  trainerSlugOrId: string, // Puede ser slug o id
  query: string,
  filters: SearchFilters = {}
): Promise<TrainerContent[]> {
  
  try {
    // Por ahora buscamos en trainer_workouts y trainer_diets usando slug
    // Luego se migrará a trainer_content_library con embeddings
    
    const results: TrainerContent[] = []
    
    // Buscar entrenamientos
    if (filters.contentType === 'all' || filters.contentType === 'workout' || !filters.contentType) {
      const { data: workouts } = await supabase
        .from('trainer_workouts')
        .select('*')
        .eq('trainer_slug', trainerSlugOrId) // Por ahora usamos slug
        .eq('is_active', true)
        .limit(10)
      
      if (workouts) {
        for (const workout of workouts) {
          // Búsqueda simple por texto (mejorar con embeddings después)
          const workoutText = JSON.stringify(workout.workout_data || {}).toLowerCase()
          const queryLower = query.toLowerCase()
          
          // Calcular relevancia simple
          let relevance = 0.5 // Base relevance
          if (workoutText.includes(queryLower)) {
            relevance = 0.9
          }
          
          // Match por objetivo
          if (filters.targetGoal && workout.workout_data?.target_goals?.includes(filters.targetGoal)) {
            relevance += 0.2
          }
          
          // Match por intensidad
          if (filters.intensity && workout.workout_data?.intensity_level) {
            const intensityDiff = Math.abs(workout.workout_data.intensity_level - filters.intensity)
            if (intensityDiff <= 2) {
              relevance += 0.1
            }
          }
          
          results.push({
            id: workout.id,
            trainer_id: workout.trainer_id || '',
            content_type: 'workout',
            source_id: workout.id,
            raw_content: JSON.stringify(workout.workout_data),
            structured_data: {
              title: workout.title,
              description: workout.description,
              workout_data: workout.workout_data
            },
            tags: workout.workout_data?.tags || [],
            target_goals: workout.workout_data?.target_goals || [],
            intensity_level: workout.workout_data?.intensity_level,
            experience_level: workout.workout_data?.experience_level,
            relevance_score: relevance
          })
        }
      }
    }
    
    // Buscar dietas
    if (filters.contentType === 'all' || filters.contentType === 'diet' || !filters.contentType) {
      const { data: diets } = await supabase
        .from('trainer_diets')
        .select('*')
        .eq('trainer_slug', trainerSlugOrId) // Por ahora usamos slug
        .eq('is_active', true)
        .limit(10)
      
      if (diets) {
        for (const diet of diets) {
          const dietText = JSON.stringify(diet.diet_data || {}).toLowerCase()
          const queryLower = query.toLowerCase()
          
          let relevance = 0.5 // Base relevance
          if (dietText.includes(queryLower)) {
            relevance = 0.9
          }
          
          if (filters.targetGoal && diet.diet_data?.target_goals?.includes(filters.targetGoal)) {
            relevance += 0.2
          }
          
          results.push({
            id: diet.id,
            trainer_id: diet.trainer_id || '',
            content_type: 'diet',
            source_id: diet.id,
            raw_content: JSON.stringify(diet.diet_data),
            structured_data: {
              title: diet.title,
              description: diet.description,
              daily_calories: diet.daily_calories,
              daily_protein_g: diet.daily_protein_g,
              daily_carbs_g: diet.daily_carbs_g,
              daily_fats_g: diet.daily_fats_g,
              diet_data: diet.diet_data
            },
            tags: diet.diet_data?.tags || [],
            target_goals: diet.diet_data?.target_goals || [],
            relevance_score: relevance
          })
        }
      }
    }
    
    // Ordenar por relevancia y limitar
    results.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    return results.slice(0, filters.limit || 10)
    
  } catch (error) {
    console.error('Error searching trainer library:', error)
    return []
  }
}

/**
 * Extrae texto plano de contenido estructurado para embeddings
 */
export function extractTextFromContent(content: any, contentType: ContentType): string {
  if (contentType === 'workout') {
    const workout = content.workout_data
    if (!workout || !workout.days) return ''
    
    let text = `${content.title || ''} ${content.description || ''} `
    
    workout.days.forEach((day: any) => {
      text += `Día ${day.day}: `
      if (day.exercises) {
        day.exercises.forEach((ex: any) => {
          text += `${ex.name} ${ex.sets} series ${ex.reps} repeticiones `
          if (ex.tempo) text += `tempo ${ex.tempo} `
          if (ex.rest_seconds) text += `descanso ${ex.rest_seconds}s `
          if (ex.notes) text += `${ex.notes} `
          if (ex.muscle_groups) text += `grupos musculares: ${ex.muscle_groups.join(', ')} `
        })
      }
    })
    
    return text
  }
  
  if (contentType === 'diet') {
    const diet = content.diet_data
    if (!diet) return ''
    
    let text = `${content.title || ''} ${content.description || ''} `
    
    if (diet.rules) {
      diet.rules.forEach((rule: any) => {
        text += `${rule.title || ''} ${rule.content || ''} `
      })
    }
    
    if (diet.allowed_foods) {
      Object.keys(diet.allowed_foods).forEach(category => {
        const foods = diet.allowed_foods[category]
        if (Array.isArray(foods)) {
          foods.forEach((food: any) => {
            text += `${category} permitido: ${food.name || food} `
            if (food.notes) text += `${food.notes} `
          })
        }
      })
    }
    
    if (diet.prohibited_foods) {
      diet.prohibited_foods.forEach((food: any) => {
        text += `prohibido: ${food.name || food} `
      })
    }
    
    return text
  }
  
  return JSON.stringify(content)
}

/**
 * Log de uso de contenido (para analytics del entrenador)
 */
export async function logContentUsage(
  trainerId: string,
  userId: string,
  contentId: string,
  query: string,
  responseType: 'workout' | 'diet' | 'general'
): Promise<void> {
  try {
    await supabase.from('trainer_content_usage_logs').insert({
      trainer_id: trainerId,
      user_id: userId,
      content_id: contentId,
      content_type: responseType,
      query: query.substring(0, 500), // Limitar longitud
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error logging content usage:', error)
    // No fallar si el log falla
  }
}

