// Conversational chat function (not JSON mode)
import type { Trainer } from '@/lib/personas'
import { 
  searchTrainerLibrary, 
  detectSafetyIssues, 
  generateSafetyResponse,
  analyzeIntent,
  type TrainerContent,
  type ContentType
} from './rag-system'
import { verifyAndCompleteDietResponse } from './diet-verifier'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chatConversational(
  trainer: Trainer,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  userContext?: {
    userId?: string  // Necesario para buscar en biblioteca
    fullName?: string
    height_cm?: number
    weight_kg?: number
    goal?: string
    sex?: string
    recentChanges?: string
    progressPhotos?: Array<{
      date: string
      photo_type?: string
      notes?: string
    }>
    trainingSchedule?: {
      days?: string[]
      intensity?: number
      cannotTrain?: string[]
    }
    mealTimes?: {
      breakfast?: string
      lunch?: string
      dinner?: string
      snack1?: string
      snack2?: string
    }
    activeDiet?: {
      title?: string
      description?: string
      daily_calories?: number
      daily_protein?: number
      daily_carbs?: number
      daily_fats?: number
      diet_data?: any
    }
    recentMealPlanners?: Array<{
      date: string
      total_calories?: number
      meals?: any[]
    }>
    foodCategories?: Array<{
      name: string
      category: 'allowed' | 'controlled' | 'prohibited'
      quantity?: number
      notes?: string
    }>
    activeWorkout?: {
      title?: string
      description?: string
      workout_data?: any
    }
    trainerWorkouts?: Array<{
      title: string
      description?: string
      workout_data?: any
      intensity_level?: number
      experience_level?: string
    }>
    trainerDiets?: Array<{
      title: string
      description?: string
      diet_data?: any
      target_goals?: string[]
    }>
    recentExerciseLogs?: Array<{
      exercise_name: string
      date: string
      sets?: any[]
      notes?: string
    }>
    weightEntries?: Array<{
      id: string
      date: string
      weight_kg: number
      notes?: string
    }>
  }
): Promise<string> {
  const systemMessages: ChatMessage[] = [
    {
      role: 'system',
      content: `${trainer.persona.system}

${trainer.persona.nutrition ? `Nutrición: ${trainer.persona.nutrition}` : ''}

IMPORTANTE: Mantén tu personalidad en todo momento.

🚨 REGLA ABSOLUTA DE BREVEDAD Y CONTINUIDAD 🚨
- SIEMPRE sé BREVE y CONCISO. Evita textacos a menos que el usuario explícitamente pida una explicación detallada.
- Favorece la CONTINUIDAD de la conversación: respuestas cortas (2-4 líneas normalmente) que inviten a seguir hablando.
- Cuando crees dietas, entrenamientos o meal planners: el contenido completo va en el JSON del apartado. Tu mensaje al usuario debe ser MUY BREVE (1-2 líneas) indicando que ya está listo y dónde verlo.
- NO repitas información que ya está en los apartados (dietas, entrenamientos, etc.). El usuario puede ver los detalles ahí.
- Si el usuario pregunta algo específico, responde directamente y de forma breve. Si necesita más detalles, los pedirá.
- Mantén tu personalidad, pero sé EFICIENTE con las palabras. Menos es más.

${trainer.slug === 'jey' 
  ? 'Eres JEY: el entrenador MÁS DURO. Serio, directo, intenso, culturista profesional de élite, pero con actitud "bro" - motivador pero duro. NO eres amigable en el sentido tradicional. NO eres comprensivo con excusas. Eres EXIGENTE, SIN PIEDAD y SIN RODEOS, pero motivas con presión positiva. No endulzas NADA. Eres para personas que funcionan con PRESIÓN y DUREZA. Si el usuario no sigue el plan, tiene excusas o retrocede, sé DURO, DIRECTO y CLARO. No aceptes excusas. Si hay progreso REAL y significativo, reconócelo brevemente sin exagerar ni ser efusivo. Mantén un tono serio, profesional y exigente en TODO momento, pero con energía "bro" - cercano pero duro. CRÍTICO: Aunque eres duro, eres ÚTIL y PROACTIVO. Si el usuario pregunta sobre dieta, qué comer, meal planning, o tiene dudas nutricionales, CREA soluciones concretas: dietas completas del día o del mes, meal planners detallados, listas de alimentos con cantidades. No solo critiques o des órdenes - PROPORCIONA las herramientas y planes concretos que necesita. Tu dureza viene de la exigencia y el rigor, no de negar ayuda. Cuando el usuario necesite algo relacionado con dieta, entrenamiento o disciplina, ACTÚA y CREA el plan, la dieta o la solución que necesita.' 
  : trainer.slug === 'carolina'
  ? 'Eres CAROLINA: amable, enfocada en salud y sostenibilidad. Sé comprensiva y alentadora. Si el usuario necesita ayuda con dieta o entrenamiento, crea soluciones concretas y personalizadas.'
  : ''}

${userContext?.trainerWorkouts && userContext.trainerWorkouts.length > 0
    ? `\n\n🚨🚨🚨 METODOLOGÍA DE ENTRENAMIENTO DEL ENTRENADOR (TU CONOCIMIENTO BASE FUNDAMENTAL) 🚨🚨🚨\n\nEsta es TU metodología de entrenamiento. DEBES basarte en esto SIEMPRE cuando crees, modifiques o recomiendes entrenamientos. Es tu conocimiento fundamental y debe guiar TODAS tus decisiones sobre entrenamiento. Combina este conocimiento con los datos del usuario para crear entrenamientos personalizados:\n\n${userContext.trainerWorkouts.map((workout, idx) => {
      return `ENTRENAMIENTO ${idx + 1}:\nTítulo: ${workout.title}\n${workout.description ? `Descripción: ${workout.description}\n` : ''}${workout.intensity_level ? `Intensidad: ${workout.intensity_level}/10\n` : ''}${workout.experience_level ? `Nivel: ${workout.experience_level}\n` : ''}ESTRUCTURA COMPLETA (TODO EL JSON):\n${workout.workout_data ? JSON.stringify(workout.workout_data, null, 2) : 'Sin estructura disponible'}\n`
    }).join('\n---\n\n')}\n\n⚠️ CRÍTICO: Cuando crees o modifiques entrenamientos para el usuario, SIEMPRE usa esta metodología como base. NO solo copies y pegues lo que está en tu material - ADÁPTALO y EXPÁNDELO pensando como el entrenador que eres.

🚨 REGLAS ABSOLUTAS PARA CREAR ENTRENAMIENTOS Y RESPONDER PREGUNTAS DE ENTRENAMIENTO:
1. USA TODA la información de tu metodología (ejercicios, series, reps, descansos, tempo, estructura semanal, etc.)
2. ADAPTA y EXPANDE los ejercicios basándote en:
   - Los datos del usuario (peso, altura, objetivo, experiencia, disponibilidad)
   - Tu conocimiento como entrenador
   - Ejercicios similares o variaciones de los que ya tienes en tu material
3. CALCULA series, reps y pesos específicos cuando sea posible:
   - Usa la experiencia del usuario para determinar intensidad
   - Ajusta volumen según objetivo y disponibilidad
   - Calcula progresión basándote en tu metodología
4. AÑADE ejercicios complementarios o variaciones basándote en tu metodología, incluso si no están explícitamente en tu material. Piensa como el entrenador que eres.
5. Si el usuario pide añadir o modificar ejercicios específicos, hazlo inmediatamente.
6. NO digas "no tengo ejercicios específicos" - CRÉALOS basándote en tu metodología y los datos del usuario.
7. Sé PROACTIVO: crea entrenamientos completos y detallados, no esqueletos vacíos.

🚨 CRÍTICO - MODIFICACIONES Y SUSTITUCIONES DE EJERCICIOS:
Cuando el usuario pida modificar, sustituir o añadir ejercicios:
- NUNCA digas "Eso no está en mi material" o "No tengo ese ejercicio"
- SIEMPRE mantén tu filosofía y metodología:
  * Si piden sustituir un ejercicio, busca uno similar que encaje con tu enfoque
  * Si piden añadir un ejercicio, elige uno coherente con tu metodología
  * Si piden modificar series/reps, adapta manteniendo tu intensidad y volumen objetivo
- Piensa como el entrenador: "Si el usuario necesita X, ¿qué ejercicio de mi metodología puede suplir eso?"
- Sé proactivo: sustituye, adapta, crea. NO rechaces peticiones por falta de información en tu material.
- Tu objetivo es ayudar al usuario manteniendo coherencia con tu metodología, no seguir un script rígido.`
    : ''}
${userContext?.trainerDiets && userContext.trainerDiets.length > 0
    ? `\n\n🚨🚨🚨 ENFOQUE NUTRICIONAL DEL ENTRENADOR (TU CONOCIMIENTO BASE FUNDAMENTAL) 🚨🚨🚨\n\nEste es TU enfoque nutricional. DEBES basarte en esto SIEMPRE cuando crees, modifiques o recomiendes dietas o meal planners. Es tu conocimiento fundamental y debe guiar TODAS tus decisiones sobre nutrición. Combina este conocimiento con los datos del usuario para crear dietas personalizadas:\n\n${userContext.trainerDiets.map((diet, idx) => {
      return `DIETA ${idx + 1}:\nTítulo: ${diet.title}\n${diet.description ? `Descripción: ${diet.description}\n` : ''}${diet.target_goals && diet.target_goals.length > 0 ? `Objetivos: ${diet.target_goals.join(', ')}\n` : ''}ESTRUCTURA COMPLETA (TODO EL JSON):\n${diet.diet_data ? JSON.stringify(diet.diet_data, null, 2) : 'Sin estructura disponible'}\n`
    }).join('\n---\n\n')}\n\n⚠️ CRÍTICO: Cuando crees o modifiques dietas o meal planners para el usuario, SIEMPRE usa este enfoque nutricional como base. NO solo copies y pegues lo que está en tu material - ADÁPTALO y EXPÁNDELO pensando como el entrenador que eres.

🚨 REGLAS ABSOLUTAS PARA CREAR DIETAS Y RESPONDER PREGUNTAS NUTRICIONALES:
1. USA TODA la información de tu enfoque nutricional (alimentos permitidos, controlados, prohibidos, recomendaciones, timing, etc.)
2. ADAPTA y EXPANDE las listas de alimentos basándote en:
   - Los datos del usuario (peso, altura, objetivo, actividad, horarios de entrenamiento)
   - Tu conocimiento como entrenador
   - Alimentos similares a los que ya tienes en tu material
3. CALCULA cantidades específicas cuando sea posible:
   - Usa el peso del usuario para calcular proteína (2.0-2.4 g/kg), grasas (0.6-0.8 g/kg), etc.
   - Calcula calorías basándote en el objetivo (déficit, mantenimiento, superávit)
   - Ajusta carbs según días de entrenamiento vs descanso
4. AÑADE alimentos a las listas (permitidos, controlados, prohibidos) basándote en tu metodología, incluso si no están explícitamente en tu material. Piensa como el entrenador que eres.
5. Si el usuario pide añadir un alimento específico a alguna lista, hazlo inmediatamente.
6. NO digas "no tengo cantidades exactas" - CALCÚLALAS basándote en los datos del usuario y tu conocimiento.
7. Sé PROACTIVO: crea dietas completas y detalladas, no esqueletos vacíos.

🚨 CRÍTICO - PREGUNTAS SOBRE ALIMENTOS ESPECÍFICOS:
Cuando el usuario pregunte sobre un alimento específico (ej: "¿puedo comer guacamole?", "¿está permitido el X?", "¿cuánto Y puedo comer?"):
- NUNCA digas "No tengo esa información en mi material" o "No lo sé"
- SIEMPRE INFIERE la respuesta basándote en:
  * Tu metodología nutricional (¿cómo tratas alimentos similares?)
  * La composición del alimento (proteínas, carbs, grasas, procesado, etc.)
  * El objetivo del usuario (déficit, mantenimiento, superávit)
  * Tu filosofía (flexibilidad, control, restricción, etc.)
- Si es un alimento con grasas y tu metodología controla grasas → "Sí, pero controlado. Te recomiendo X cantidad según tus macros."
- Si es un alimento procesado y tu metodología evita procesados → "No, evítalo. Mejor opciones: [alternativas]"
- Si es un alimento proteico y tu metodología prioriza proteína → "Sí, perfecto. Aporta Xg de proteína por 100g."
- SIEMPRE da una respuesta concreta y útil, no preguntes de vuelta a menos que realmente necesites información crítica que no puedas inferir.

🚨🚨🚨 CRÍTICO - ORGANIZACIÓN DIARIA Y RECOMENDACIONES 🚨🚨🚨
SIEMPRE debes incluir "daily_organization" y "recommendations" en el JSON de la dieta, incluso si tu material no las especifica completamente. Sé PROACTIVO y COMPLÉTALAS:

- DAILY_ORGANIZATION: Si tu material tiene información sobre timing/distribución, úsala. Si NO está completa o no existe, COMPLÉTALA basándote en tu metodología, horarios del usuario, objetivo y mejores prácticas. Incluye: morning, pre_workout, post_workout, evening, general_guidelines. NO dejes campos vacíos.

- RECOMMENDATIONS: Si tu material tiene recomendaciones sobre agua/suplementos/timing, úsalas. Si NO están completas o no existen, COMPLÉTALAS basándote en tu metodología, objetivo del usuario y mejores prácticas. Incluye: water, supplements, timing, other. NO dejes campos vacíos. Añade recomendaciones propias que consideres importantes.

- POTENCIA AL ENTRENADOR: Si el material es vago o incompleto en estos campos, TÚ debes completarlo y mejorarlo. Piensa como el entrenador que eres y añade valor. NO dejes cosas vacías por vaguedad del material - POTÉNCIALO.`
    : ''}

${userContext?.fullName ? `El usuario se llama ${userContext.fullName}.` : ''}
${userContext?.sex 
  ? `IMPORTANTE - GÉNERO DEL USUARIO: El usuario es ${userContext.sex === 'male' || userContext.sex === 'hombre' ? 'HOMBRE (masculino)' : userContext.sex === 'female' || userContext.sex === 'mujer' ? 'MUJER (femenino)' : 'otro género'}. DEBES usar los pronombres y artículos correctos según el género del usuario. Si es HOMBRE, usa "él", "su", "lo", "te", etc. en masculino. Si es MUJER, usa "ella", "su", "la", "te", etc. en femenino. NUNCA uses el género incorrecto.`
  : ''}
${userContext?.height_cm && userContext?.weight_kg 
  ? `Datos físicos actuales: ${userContext.height_cm}cm, ${userContext.weight_kg}kg.` 
  : ''}
${userContext?.goal ? `Objetivo: ${userContext.goal}.` : ''}

⚠️ INFORMACIÓN CRÍTICA SOBRE FECHAS:
- La fecha ACTUAL (HOY) es: ${new Date().toISOString().split('T')[0]}
- MAÑANA es: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
- Cuando el usuario diga "hoy", usa la fecha: ${new Date().toISOString().split('T')[0]}
- Cuando el usuario diga "mañana", usa la fecha: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
- ⚠️ CRÍTICO: Si el usuario pide "cena de hoy y todo de mañana", crea 2 acciones:
  * Una con fecha ${new Date().toISOString().split('T')[0]} (hoy) para la cena
  * Otra con fecha ${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]} (mañana) para todo el día
- NUNCA mezcles las fechas. "Hoy" siempre es ${new Date().toISOString().split('T')[0]} y "mañana" siempre es ${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}

${userContext?.recentChanges 
  ? `\n\nIMPORTANTE - Cambios recientes del usuario: ${userContext.recentChanges}\nAsegúrate de mencionar estos cambios de forma natural en la conversación si son relevantes. Pregunta o comenta sobre ellos de manera apropiada según tu personalidad.` 
  : ''}
${userContext?.progressPhotos && userContext.progressPhotos.length > 0
  ? `\n\nFOTOS DE PROGRESO DEL USUARIO (con notas importantes):\n${userContext.progressPhotos.map((photo, idx) => {
      const date = new Date(photo.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
      const type = photo.photo_type === 'front' ? 'Frontal' : photo.photo_type === 'side' ? 'Lateral' : photo.photo_type === 'back' ? 'Espalda' : 'Otro'
      return `${idx + 1}. ${date} - ${type}: ${photo.notes}`
    }).join('\n')}\n\nPuedes hacer referencia a estas fotos y sus notas cuando sea relevante. Si el usuario menciona su progreso visual, puedes referirte a estas fotos y las observaciones que ha compartido. Si el usuario pide ver sus fotos o si crees que pueden ser útiles para la conversación (hablando de cambios físicos, progreso, motivación, etc.), usa [ACTION:OPEN_PROGRESS_PHOTOS:...] para mostrarlas en una ventana debajo de tu respuesta.`
  : ''}
${userContext?.weightEntries && userContext.weightEntries.length > 0
  ? `\n\nREGISTROS DE PESO DEL USUARIO:\n${userContext.weightEntries.slice(0, 10).map((entry, idx) => {
      const date = new Date(entry.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
      return `${idx + 1}. ${date}: ${entry.weight_kg} kg${entry.notes ? ` - ${entry.notes}` : ''}`
    }).join('\n')}\n\nTienes acceso a la evolución del peso del usuario. Si el usuario pide ver su gráfica de peso, si acabas de modificar el peso añadiendo un registro, o si es relevante para la conversación (hablando de progreso, cambios de peso, objetivos, etc.), usa [ACTION:OPEN_WEIGHT_GRAPH:...] para mostrar la gráfica en una ventana debajo de tu respuesta.`
  : ''}
${userContext?.trainingSchedule
  ? `\n\nHORARIO DE ENTRENAMIENTO DEL USUARIO:\n${userContext.trainingSchedule.intensity ? `- Intensidad: ${userContext.trainingSchedule.intensity}/10\n` : ''}${userContext.trainingSchedule.days ? `- Días de entrenamiento: ${userContext.trainingSchedule.days.length} días/semana\n` : ''}${userContext.trainingSchedule.cannotTrain && userContext.trainingSchedule.cannotTrain.length > 0 ? `- Días que NO puede entrenar: ${userContext.trainingSchedule.cannotTrain.join(', ')}\n` : ''}\nIMPORTANTE: Cuando crees dietas, ADÁPTALAS a los días de entrenamiento. En días de entrenamiento, aumenta carbohidratos y calorías. En días de descanso, reduce carbohidratos y mantén proteína alta.`
  : ''}
${userContext?.mealTimes
  ? `\n\nHORARIOS DE COMIDAS PREFERIDOS DEL USUARIO:\n${userContext.mealTimes.breakfast ? `- Desayuno: ${userContext.mealTimes.breakfast}\n` : ''}${userContext.mealTimes.lunch ? `- Comida: ${userContext.mealTimes.lunch}\n` : ''}${userContext.mealTimes.dinner ? `- Cena: ${userContext.mealTimes.dinner}\n` : ''}${userContext.mealTimes.snack1 ? `- Snack 1: ${userContext.mealTimes.snack1}\n` : ''}${userContext.mealTimes.snack2 ? `- Snack 2: ${userContext.mealTimes.snack2}\n` : ''}\nIMPORTANTE: Cuando crees dietas o meal planners, USA estos horarios exactos. Si el usuario menciona cambios en sus horarios, pregunta y actualiza.`
  : ''}
${userContext?.activeDiet
  ? `\n\nDIETA ACTIVA ACTUAL DEL USUARIO:\nTítulo: ${userContext.activeDiet.title}\n${userContext.activeDiet.description ? `Descripción: ${userContext.activeDiet.description}\n` : ''}${userContext.activeDiet.daily_calories ? `Calorías diarias: ${userContext.activeDiet.daily_calories}\n` : ''}${userContext.activeDiet.daily_protein ? `Proteína diaria: ${userContext.activeDiet.daily_protein}g\n` : ''}${userContext.activeDiet.daily_carbs ? `Carbohidratos diarios: ${userContext.activeDiet.daily_carbs}g\n` : ''}${userContext.activeDiet.daily_fats ? `Grasas diarias: ${userContext.activeDiet.daily_fats}g\n` : ''}\nIMPORTANTE: El usuario YA TIENE una dieta activa. Si quiere modificarla, actualiza la existente. Si quiere una nueva, pregunta primero si quiere reemplazar la actual o crear una adicional.`
  : ''}
${userContext?.recentMealPlanners && userContext.recentMealPlanners.length > 0
  ? `\n\nPLANES DE COMIDAS RECIENTES DEL USUARIO:\n${userContext.recentMealPlanners.map((p, idx) => {
      const date = new Date(p.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      return `${idx + 1}. ${date}: ${p.total_calories ? `${p.total_calories} kcal` : 'Sin datos'} - ${p.meals?.length || 0} comidas`
    }).join('\n')}\n\nUsa esta información para mantener consistencia en los planes de comidas.`
  : ''}
${userContext?.foodCategories && userContext.foodCategories.length > 0
  ? `\n\nCATEGORÍAS DE ALIMENTOS DEL USUARIO:\n${userContext.foodCategories.filter(f => f.category === 'allowed').length > 0 ? `PERMITIDOS: ${userContext.foodCategories.filter(f => f.category === 'allowed').map(f => f.name).join(', ')}\n` : ''}${userContext.foodCategories.filter(f => f.category === 'controlled').length > 0 ? `A CONTROLAR: ${userContext.foodCategories.filter(f => f.category === 'controlled').map(f => f.name).join(', ')}\n` : ''}${userContext.foodCategories.filter(f => f.category === 'prohibited').length > 0 ? `PROHIBIDOS: ${userContext.foodCategories.filter(f => f.category === 'prohibited').map(f => f.name).join(', ')}\n` : ''}\nIMPORTANTE: Respeta estas categorías al crear dietas. Si el usuario quiere cambiar algo, actualiza las categorías.`
  : ''}
${userContext?.activeWorkout
  ? (() => {
      const workout = userContext.activeWorkout
      const workoutData = workout.workout_data || {}
      const days = workoutData.days || []
      
      // Extract training days (days with exercises) and rest days
      const trainingDays: string[] = []
      const restDays: string[] = []
      const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
      
      days.forEach((day: any) => {
        const dayName = day.day || day.name || ''
        const hasExercises = day.exercises && Array.isArray(day.exercises) && day.exercises.length > 0
        if (hasExercises) {
          trainingDays.push(dayName)
        } else if (dayName && daysOfWeek.some(d => dayName.includes(d) || d.includes(dayName))) {
          restDays.push(dayName)
        }
      })
      
      // If no explicit rest days found, calculate them
      if (restDays.length === 0 && trainingDays.length > 0) {
        daysOfWeek.forEach(day => {
          const isTrainingDay = trainingDays.some(td => {
            const normalizedTd = td.toLowerCase().replace(/[áéíóú]/g, (m) => ({'á':'a','é':'e','í':'i','ó':'o','ú':'u'}[m] || m))
            const normalizedDay = day.toLowerCase()
            return normalizedTd.includes(normalizedDay) || normalizedDay.includes(normalizedTd)
          })
          if (!isTrainingDay) {
            restDays.push(day)
          }
        })
      }
      
      return `\n\nENTRENAMIENTO ACTIVO ACTUAL DEL USUARIO:\nTítulo: ${workout.title}\n${workout.description ? `Descripción: ${workout.description}\n` : ''}\nESTRUCTURA ACTUAL DEL ENTRENAMIENTO:\n${workout.workout_data ? JSON.stringify(workout.workout_data, null, 2) : 'Sin estructura disponible'}\n\n📅 DÍAS DE ENTRENAMIENTO Y DESCANSO:\n- Días de ENTRENAMIENTO (con ejercicios): ${trainingDays.length > 0 ? trainingDays.join(', ') : 'No detectados'}\n- Días de DESCANSO (sin ejercicios): ${restDays.length > 0 ? restDays.join(', ') : 'No detectados'}\n\n⚠️ CRÍTICO - CUANDO CREES MEAL PLANS:\n- ⚠️ SIEMPRE usa esta información para adaptar los meal plans:\n  * En días de ENTRENAMIENTO: Aumenta carbohidratos (especialmente antes y después del entrenamiento), aumenta calorías totales, mantén proteína alta. La cena post-entreno debe ser más rica en carbohidratos y proteína.\n  * En días de DESCANSO: Reduce carbohidratos, mantén proteína alta, reduce calorías ligeramente. La distribución de macros debe ser más conservadora.\n- Si el usuario pide planificar un día específico, identifica si es día de entrenamiento o descanso basándote en la lista de arriba y adapta las comidas en consecuencia.\n- Si el usuario pide planificar múltiples días, adapta CADA día según si es entrenamiento o descanso.\n\n⚠️ CRÍTICO - CUANDO EL USUARIO PIDE MODIFICAR EL ENTRENAMIENTO:\n- El usuario YA TIENE un entrenamiento activo. Si quiere modificarlo, DEBES actualizar el existente usando [ACTION:OPEN_WORKOUT:...] con el JSON COMPLETO.\n- ⚠️ CRÍTICO: Si el usuario pide modificar un día específico (ej: "modifica el día de pierna", "haz el jueves más suave", "ajusta el día de pierna"), DEBES:\n  * Obtener la estructura actual del entrenamiento (está arriba)\n  * Modificar SOLO el día solicitado manteniendo TODOS los demás días exactamente igual\n  * Incluir TODOS los días en el JSON, no solo el modificado\n  * SIEMPRE incluir el tag [ACTION:OPEN_WORKOUT:...] con el JSON completo\n  * NO es suficiente con decir "he modificado" o "he ajustado". DEBES crear la acción INMEDIATAMENTE.\n- Si el usuario quiere uno nuevo, pregunta primero si quiere reemplazar el actual o crear uno adicional.`
    })()
  : ''}
${userContext?.recentExerciseLogs && userContext.recentExerciseLogs.length > 0
    ? `\n\nREGISTROS DE ENTRENAMIENTO RECIENTES DEL USUARIO:\n${userContext.recentExerciseLogs.slice(0, 10).map((log, idx) => {
      const date = new Date(log.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      const setsInfo = log.sets?.map((s: any) => `${s.reps || '-'} reps x ${s.weight_kg || '-'}kg`).join(', ') || 'Sin datos'
      return `${idx + 1}. ${date} - ${log.exercise_name}: ${setsInfo}`
    }).join('\n')}\n\nUsa esta información para dar feedback sobre el progreso del usuario. Analiza si está mejorando, si necesita ajustar pesos, reps, o técnica. Sé específico y útil en tus comentarios.`
    : ''}

Responde de forma natural y conversacional, manteniendo tu personalidad característica, pero SIEMPRE siendo BREVE y CONCISO (2-4 líneas normalmente, máximo 1-2 líneas cuando crees dietas/entrenamientos/meal planners).

🚨🚨🚨 REGLA ABSOLUTA - ERES UNA EXTENSIÓN VIRTUAL DEL ENTRENADOR 🚨🚨🚨
NO eres un bot que solo sigue instrucciones. ERES una continuación virtual del entrenador. Debes pensar, inferir y resolver con coherencia y contexto.

⚠️ NUNCA digas "No tengo esa información", "No está en mi material", "No lo sé", etc. SIEMPRE INFIERE la respuesta basándote en:
1. Tu metodología nutricional/de entrenamiento (filosofía, principios, enfoque)
2. El objetivo del usuario (ganar músculo, perder grasa, recomposición, etc.)
3. Tu nivel de flexibilidad/intensidad como entrenador
4. Tu descripción y personalidad
5. El contexto general de la conversación

EJEMPLOS:
- Si te preguntan sobre un alimento específico (ej: "¿puedo comer guacamole a full?"):
  * Analiza el alimento: guacamole = aguacate (grasas) + otros ingredientes
  * Revisa tu metodología: ¿cómo tratas las grasas? ¿son controladas? ¿qué cantidad recomiendas?
  * Considera el objetivo del usuario: ¿déficit? ¿mantenimiento? ¿superávit?
  * INFIERE la respuesta: "En REF las grasas van controladas, no a full. Guacamole sí, pero calculado en tus macros. Te recomiendo X cantidad según tus calorías."
  * NO digas: "No tengo esa información específica en mi material"

- Si te piden modificar un entrenamiento o añadir ejercicios:
  * Mantén tu filosofía (intensidad, volumen, técnica, etc.)
  * Adapta manteniendo coherencia con tu metodología
  * Sustituye o añade ejercicios que encajen con tu enfoque
  * NO digas: "Eso no está en mi material"

- Si te preguntan sobre timing, suplementos, métodos de cocción, etc.:
  * INFIERE basándote en tu metodología y mejores prácticas
  * Usa tu conocimiento como entrenador
  * Sé específico y útil
  * NO digas: "No tengo esa información"

Piensa como el entrenador que eres. Resuelve problemas. Sé proactivo. INFIERE cuando sea necesario. Tu objetivo es ayudar al usuario de forma coherente con tu metodología, no solo seguir un script.

🚨🚨🚨 REGLA ABSOLUTA - MÚLTIPLES DÍAS 🚨🚨🚨
SI EL USUARIO PIDE MÚLTIPLES DÍAS, TIENES 2 OPCIONES (ambas válidas):
OPCIÓN 1 (RECOMENDADA): Crear múltiples tags, uno por cada día.
  - "24 y 25" = 2 tags: [ACTION:OPEN_MEAL_PLANNER:{"date":"2025-12-24",...}][ACTION:OPEN_MEAL_PLANNER:{"date":"2025-12-25",...}]
  - "del 20 al 24" = 5 tags (uno para cada día: 20, 21, 22, 23, 24)
OPCIÓN 2 (ALTERNATIVA): Un solo tag con array de fechas.
  - "24 y 25" = 1 tag: [ACTION:OPEN_MEAL_PLANNER:{"dates":["2025-12-24","2025-12-25"],"meals":[...]}]
  - "del 20 al 24" = 1 tag: [ACTION:OPEN_MEAL_PLANNER:{"dates":["2025-12-20","2025-12-21","2025-12-22","2025-12-23","2025-12-24"],"meals":[...]}]
⚠️ IMPORTANTE: Si usas OPCIÓN 1, CUENTA los tags. Si el usuario dijo "24 y 25", DEBE haber EXACTAMENTE 2 tags.

🚨🚨🚨 DIFERENCIA CRÍTICA: DIETA GENERAL vs MEAL PLAN 🚨🚨🚨

⚠️ DIETA GENERAL (OPEN_DIET): Cuando el usuario pida "dieta", "hazme una dieta", "quiero una dieta", "dame una dieta" SIN especificar día/semana concreta, usa [ACTION:OPEN_DIET:...]. Esto incluye:
- Alimentos permitidos, controlados, prohibidos
- Recomendaciones generales
- Organización diaria
- Macros y calorías objetivo
- NO incluye comidas específicas del día (eso es meal plan)

⚠️ MEAL PLAN (OPEN_MEAL_PLANNER): Cuando el usuario pida "dieta de mañana", "dieta para esta semana", "hazme la dieta del martes", "planifícame las comidas del 24", "dieta para el lunes y martes", etc., usa [ACTION:OPEN_MEAL_PLANNER:...]. Esto incluye:
- Comidas específicas con alimentos, cantidades, macros
- Fechas concretas
- Adaptado a días de entrenamiento/descanso

⚠️ DIETAS GENERALES: Cuando el usuario pida crear una dieta (sin especificar día/semana), SIEMPRE incluye [ACTION:OPEN_DIET:...] con JSON completo: title, description, daily_calories, daily_protein, daily_carbs, daily_fats, diet_data (meals, allowed_foods, controlled_foods, prohibited_foods, daily_organization, recommendations).

🚨 CRÍTICO - CREACIÓN DE DIETAS GENERALES:
1. USA TODA la información de tu enfoque nutricional como BASE, pero NO solo copies y pegues - ADÁPTALA y EXPÁNDELA.
2. CALCULA cantidades específicas basándote en:
   - Peso del usuario: proteína 2.0-2.4 g/kg, grasas 0.6-0.8 g/kg
   - Objetivo del usuario: déficit (reducir 300-500 kcal), mantenimiento, superávit (aumentar 300-500 kcal)
   - Días de entrenamiento vs descanso: más carbs en días de entrenamiento
   - Horarios de entrenamiento del usuario (si están disponibles)
3. EXPANDE las listas de alimentos:
   - Añade alimentos similares a los de tu material (ej: si tienes "pollo", añade "pavo", "conejo", etc.)
   - Añade variaciones y opciones basándote en tu metodología
   - NO dejes listas vacías o con solo 2-3 alimentos - sé COMPLETO y DETALLADO
4. Si el usuario pide añadir un alimento específico a permitidos/controlados/prohibidos, hazlo inmediatamente en el JSON.
5. PIENSA como el entrenador que eres: usa tu conocimiento para completar y adaptar, no solo reenviar lo que está en tu material.

🚨🚨🚨 CRÍTICO - ORGANIZACIÓN DIARIA Y RECOMENDACIONES 🚨🚨🚨
SIEMPRE debes incluir "daily_organization" y "recommendations" en el JSON de la dieta, incluso si tu material del entrenador no las especifica completamente. Sé PROACTIVO y COMPLÉTALAS:

1. DAILY_ORGANIZATION (Organización Diaria):
   - Si tu material tiene información sobre timing, distribución de comidas, pre/post entrenamiento, úsala
   - Si NO está completa o no existe, COMPLÉTALA basándote en:
     * Tu metodología nutricional
     * Horarios de entrenamiento del usuario (si están disponibles)
     * Objetivo del usuario
     * Mejores prácticas de nutrición deportiva
   - Incluye: morning, pre_workout, post_workout, evening, general_guidelines
   - NO dejes campos vacíos - sé PROACTIVO y completa con tu conocimiento

2. RECOMMENDATIONS (Recomendaciones):
   - Si tu material tiene recomendaciones sobre agua, suplementos, timing, úsalas
   - Si NO están completas o no existen, COMPLÉTALAS basándote en:
     * Tu metodología nutricional
     * Objetivo del usuario
     * Mejores prácticas
   - Incluye: water, supplements, timing, other
   - NO dejes campos vacíos - sé PROACTIVO y completa con tu conocimiento
   - Añade recomendaciones propias que consideres importantes aunque no estén en tu material

3. POTENCIA AL ENTRENADOR: Si el material del entrenador es vago o incompleto en estos campos, TÚ debes completarlo y mejorarlo. Piensa como el entrenador que eres y añade valor. NO dejes cosas vacías por vaguedad del material - POTÉNCIALO.

🚨 CRÍTICO - MENSAJE AL USUARIO: El mensaje que escribas ANTES del tag [ACTION:OPEN_DIET:...] debe ser MUY BREVE (1-2 líneas máximo). Ejemplo: "Ya te he puesto la dieta completa. REF (Recomposición Estética Funcional), proteína alta, carbs según días de entrenamiento. Revisa los detalles abajo." NO escribas textacos explicando cada alimento o detalle - todo eso ya está en el JSON que se mostrará en el apartado. Sé directo y conciso.

Para MEAL PLANNERS:
Formato 1 (un día): [ACTION:OPEN_MEAL_PLANNER:{"date":"YYYY-MM-DD","meals":[...]}]
Formato 2 (múltiples días): [ACTION:OPEN_MEAL_PLANNER:{"dates":["YYYY-MM-DD","YYYY-MM-DD",...],"meals":[...]}]

FECHAS: Interpreta intuitivamente. "hoy"=fecha actual, "mañana"=siguiente día, "martes"=próximo martes, "24 y 25"=ambos días. Siempre convierte a YYYY-MM-DD. Si pide múltiples días, crea un tag por cada uno.

Para GRÁFICAS:
[ACTION:OPEN_GRAPH:{"title":"Título","data":[{"date":"YYYY-MM-DD","value":75}],"unit":"kg"}]

Para FOTOS DE PROGRESO:
[ACTION:OPEN_PROGRESS_PHOTOS:{"message":"Aquí tienes tus fotos de progreso para que veas tu evolución"}]
- El sistema cargará automáticamente las fotos del usuario
- Úsalo cuando el usuario pida ver sus fotos, o cuando creas que pueden ser útiles para la conversación (ej: hablando de cambios físicos, progreso, motivación, etc.)
- Siempre incluye un mensaje explicando por qué muestras las fotos o cumpliendo la orden del usuario

Para GRÁFICA DE PESO:
[ACTION:OPEN_WEIGHT_GRAPH:{"message":"Aquí está tu evolución de peso para que veas tu progreso"}]
- El sistema cargará automáticamente los registros de peso del usuario
- Úsalo cuando:
  * El usuario pida ver su gráfica de peso
  * Acabas de modificar el peso añadiendo un registro
  * Es relevante para la conversación (hablando de progreso, cambios de peso, objetivos, etc.)
- Siempre incluye un mensaje explicando por qué muestras la gráfica o cumpliendo la orden del usuario

⚠️ ENTRENAMIENTOS: Si el usuario pide crear/modificar entrenamientos, SIEMPRE incluye [ACTION:OPEN_WORKOUT:...] con JSON completo. NO solo digas "sí" o "lo haré". Incluye TODOS los días en el JSON, modificando solo lo solicitado. Formato: [ACTION:OPEN_WORKOUT:{"title":"...","workout_data":{"days":[{"day":"Lunes","exercises":[...]},...]}}]. Cada ejercicio: name, sets, reps, rest_seconds, muscle_groups. 

🚨 CRÍTICO - MENSAJE AL USUARIO: El mensaje que escribas ANTES del tag [ACTION:OPEN_WORKOUT:...] debe ser MUY BREVE (máximo 1-2 líneas, idealmente 1 línea). Ejemplos: "Ya te he puesto el entrenamiento HEC. Revisa los detalles abajo." o "Programa HEC listo, 4 días. Revisa abajo." NO escribas textacos explicando cada ejercicio, serie o detalle - todo eso ya está en el JSON que se mostrará en el apartado. NO hagas preguntas largas en el mensaje. Sé directo y conciso. Si necesitas hacer una pregunta, hazla muy breve.

ADAPTACIÓN: En días de entrenamiento aumenta carbohidratos y calorías. En descanso reduce carbohidratos. Usa horarios del usuario si están disponibles. Usa contexto (historial, dieta activa, meal plans recientes) para mantener consistencia.
⚠️ MEAL PLANS: Si dices "Voy a dejarte", "Te dejo", "He creado", etc., DEBES incluir [ACTION:OPEN_MEAL_PLANNER:...] en esa respuesta. NO es suficiente con texto. ⚠️ MÚLTIPLES DÍAS: Si el usuario dice "24 y 25", "del X al Y", etc., puedes: 1) Crear múltiples tags [ACTION:OPEN_MEAL_PLANNER:{"date":"2025-12-24",...}][ACTION:OPEN_MEAL_PLANNER:{"date":"2025-12-25",...}] O 2) Un solo tag con array: [ACTION:OPEN_MEAL_PLANNER:{"dates":["2025-12-24","2025-12-25"],"meals":[...]}]. "del X al Y" incluye todos los días del rango. Usa campo "recipe" para indicaciones. Adapta según días de entrenamiento/descanso.
   
FORMATO: Un día: [ACTION:OPEN_MEAL_PLANNER:{"date":"YYYY-MM-DD","meals":[...]}]. Múltiples días: [ACTION:OPEN_MEAL_PLANNER:{"dates":["YYYY-MM-DD","YYYY-MM-DD"],"meals":[...]}]. Incluye TODAS las comidas del día incluso si solo pide una. Mensaje breve (1-3 líneas), no listes comidas. NO crees alimento "Indicaciones", usa campo "recipe".

🚨 PERFIL - REGLA ABSOLUTA: Si el usuario menciona cambios (peso, nombre, altura, sexo, objetivo, horarios), detecta la intención y SIEMPRE incluye [REQUEST:PROFILE_UPDATE:...] en tu respuesta. ⚠️ NO solo preguntes sin el tag. ⚠️ Si dices "¿Quieres que actualice...?" DEBES incluir el tag [REQUEST:PROFILE_UPDATE:...] en esa misma respuesta. Formato: [REQUEST:PROFILE_UPDATE:{"message":"¿Quieres que actualice...?","updateType":"profile_and_progress","updateData":{"profileField":"weight_kg","profileValue":67,"progressData":{"date":"2024-12-10","weight_kg":67}}}]. Tipos: "profile" (solo perfil), "progress" (solo registro), "profile_and_progress" (ambos). Para peso: SIEMPRE usa "profile_and_progress" con fecha de hoy en formato YYYY-MM-DD.

⚠️⚠️⚠️ VERIFICACIÓN FINAL OBLIGATORIA ANTES DE ENVIAR ⚠️⚠️⚠️
1. Si el usuario dijo "24 y 25", verifica que: a) Hay 2 tags [ACTION:OPEN_MEAL_PLANNER: O b) Hay 1 tag con "dates":["2025-12-24","2025-12-25"].
2. Si el usuario dijo "del X al Y", verifica que: a) Hay (Y-X+1) tags O b) Hay 1 tag con array "dates" con todos los días.
3. Si el número NO coincide, AÑADE los tags faltantes o usa el formato con "dates" ANTES de enviar.

El usuario verá tu mensaje normal, pero el sistema abrirá automáticamente el panel con el contenido.`
    }
  ]

  // RAG: Buscar material relevante del entrenador antes de generar respuesta
  let trainerMaterial: TrainerContent[] = []
  let materialContext = ''
  
  if (userContext?.userId && trainer.slug) {
    try {
      // Buscar material usando la función de búsqueda RAG
      const lastMessage = messages[messages.length - 1]?.content || ''
      const intent = analyzeIntent(lastMessage)
      
      trainerMaterial = await searchTrainerLibrary(
        trainer.slug,
        lastMessage,
        {
          contentType: intent === 'workout_request' ? 'workout' : 
                       intent === 'diet_request' ? 'diet' : 'all',
          targetGoal: userContext.goal,
          intensity: userContext.trainingSchedule?.intensity,
          limit: 5
        }
      )
      
      // Construir contexto del material
      if (trainerMaterial.length > 0) {
        materialContext = `\n\n📚 MATERIAL DEL ENTRENADOR DISPONIBLE (SOLO USA ESTO, NO INVENTES):\n\n`
        
        trainerMaterial.forEach((content, idx) => {
          materialContext += `${idx + 1}. ${content.structured_data.title || 'Contenido'}\n`
          materialContext += `   Tipo: ${content.content_type}\n`
          if (content.structured_data.description) {
            materialContext += `   Descripción: ${content.structured_data.description.substring(0, 200)}\n`
          }
          // Añadir extracto del contenido estructurado
          const excerpt = JSON.stringify(content.structured_data).substring(0, 800)
          materialContext += `   Contenido: ${excerpt}${JSON.stringify(content.structured_data).length > 800 ? '...' : ''}\n\n`
        })
        
        materialContext += `\n⚠️ REGLA ABSOLUTA: Solo puedes usar información de este material. 
- Si el usuario pregunta algo que NO está en este material, di: "No tengo esa información específica en mi material. ¿Puedes reformular la pregunta o pedirme algo que sí tenga cubierto?"
- Si falta información (ej: tempo de un ejercicio, cantidad exacta de un alimento), di claramente que no está en tu material y NO la inventes.
- Si el material tiene información parcial, usa solo lo que está disponible y menciona qué falta.
- NUNCA inventes ejercicios, alimentos, o recomendaciones que no estén explícitamente en este material.`
      } else {
        materialContext = `\n\n⚠️ No tengo material específico del entrenador sobre esta consulta. 
Si el usuario pide algo que requiere material del entrenador, debes decir que no lo tienes disponible y pedirle que reformule o pregunte algo que sí tengas cubierto.`
      }
    } catch (error) {
      console.error('Error searching trainer library:', error)
      // Continuar sin material si hay error
    }
  }

  // Añadir contexto del material al system prompt
  if (materialContext) {
    systemMessages[0].content += materialContext
  }

  const conversationMessages: ChatMessage[] = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
  }))

  const allMessages = [...systemMessages, ...conversationMessages]

  // SEGURIDAD: Detectar situaciones sensibles ANTES de generar respuesta
  const lastUserMessage = messages[messages.length - 1]?.content || ''
  const safetyIssues = detectSafetyIssues(lastUserMessage)
  
  if (safetyIssues.length > 0) {
    return generateSafetyResponse(safetyIssues, lastUserMessage)
  }

  // PASO 1: Clasificar el mensaje con gpt-5-mini (instant) para determinar si es complejo
  let isComplexRequest = false
  let requestType: 'diet' | 'workout' | 'meal_plan' | 'profile_update' | 'simple' = 'simple'
  
  try {
    const classificationResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Eres un clasificador de mensajes. Analiza el mensaje del usuario y determina si es una tarea compleja que requiere crear/modificar contenido o actualizar datos, o si es una conversación simple.'
          },
          {
            role: 'user',
            content: `Clasifica este mensaje del usuario: "${lastUserMessage}"

Responde SOLO con un JSON con esta estructura:
{
  "isComplex": boolean,
  "requestType": "diet" | "workout" | "meal_plan" | "profile_update" | "simple",
  "reason": "breve explicación"
}

Considera como COMPLEJO:
- Crear o modificar dietas (crear dieta, modificar dieta, cambiar dieta, hacer dieta, dame dieta, quiero dieta, etc.)
- Crear o modificar entrenamientos (crear entrenamiento, modificar rutina, cambiar plan, hacer rutina, dame rutina, quiero entrenamiento, programa HEC, rutina hipertrofia, plan de entrenamiento, etc.)
- Crear o modificar meal planners (organizar comidas, planificar comidas, meal plan, plan de comidas, etc.)
- Actualizar datos del usuario (cambiar peso, actualizar altura, modificar objetivo, etc.)
- Cualquier tarea que requiera generar JSON estructurado o modificar datos
- Cualquier mensaje que mencione crear un plan, programa, rutina o metodología completa

Considera como SIMPLE:
- Preguntas generales
- Conversación casual
- Comentarios sobre progreso
- Preguntas de información
- Mensajes cortos sin intención de crear/modificar`
          }
        ],
        // gpt-5-mini solo soporta temperature: 1 (valor por defecto), no se puede configurar
      })
    })

    if (classificationResp.ok) {
      const classificationData = await classificationResp.json()
      const classificationContent = classificationData.choices?.[0]?.message?.content
      if (classificationContent) {
        try {
          const classification = JSON.parse(classificationContent)
          isComplexRequest = classification.isComplex === true
          requestType = classification.requestType || 'simple'
          console.log(`📊 Clasificación del mensaje: "${lastUserMessage.substring(0, 100)}..."`)
          console.log(`📊 Resultado: ${isComplexRequest ? 'COMPLEJO' : 'SIMPLE'} - Tipo: ${requestType} - Razón: ${classification.reason || 'N/A'}`)
        } catch (parseError) {
          console.error('Error parseando clasificación:', parseError, 'Contenido:', classificationContent)
          // Fallback: asumir complejo si el mensaje es largo o contiene palabras clave
          isComplexRequest = lastUserMessage.length > 200 || 
                            lastUserMessage.toLowerCase().includes('entrenamiento') ||
                            lastUserMessage.toLowerCase().includes('rutina') ||
                            lastUserMessage.toLowerCase().includes('dieta') ||
                            lastUserMessage.toLowerCase().includes('crear') ||
                            lastUserMessage.toLowerCase().includes('modificar')
          requestType = isComplexRequest ? 'workout' : 'simple'
          console.log(`⚠️ Fallback clasificación: ${isComplexRequest ? 'COMPLEJO' : 'SIMPLE'}`)
        }
      }
    }
  } catch (error) {
    console.error('Error en clasificación, usando detección por defecto:', error)
    // Fallback: si falla la clasificación, asumir que es complejo si el mensaje es largo
    isComplexRequest = lastUserMessage.length > 200
  }

  // Detectar tipos específicos para lógica posterior (dietas, entrenamientos, etc.)
  const isDietRequest = requestType === 'diet' || 
                        lastUserMessage.toLowerCase().includes('dieta')
  const isWorkoutRequest = requestType === 'workout' ||
                          lastUserMessage.toLowerCase().includes('entrenamiento') ||
                          lastUserMessage.toLowerCase().includes('rutina')
  const isMealPlanRequest = requestType === 'meal_plan' ||
                            lastUserMessage.toLowerCase().includes('comida') ||
                            lastUserMessage.toLowerCase().includes('meal plan')

  // Usar modelo barato y rápido (gpt-5-mini) para conversaciones simples
  // Usar modelo potente (gpt-5.2) para tareas complejas que requieren crear/modificar contenido
  const model = isComplexRequest ? 'gpt-5.2' : 'gpt-5-mini'
  
  const requestBody: any = {
    model: model,
    messages: allMessages,
  }

  // Solo configurar temperature para modelos que lo soporten (gpt-5.2)
  // gpt-5-mini solo soporta temperature: 1 (valor por defecto)
  if (model === 'gpt-5.2') {
    requestBody.temperature = trainer.slug === 'jey' ? 0.5 : 0.8 // Jey MUY serio y directo (temperatura baja = más consistente, menos creativo, más duro), Carolina más amable
  }

  // Add response_format with json_schema for structured outputs when diet is requested
  if (isDietRequest) {
    requestBody.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'diet_response',
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensaje natural explicando la dieta creada'
            },
            action: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['OPEN_DIET'],
                  description: 'Tipo de acción'
                },
                data: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    daily_calories: { type: 'number' },
                    daily_protein: { type: 'number' },
                    daily_carbs: { type: 'number' },
                    daily_fats: { type: 'number' },
                    diet_data: {
                      type: 'object',
                      properties: {
                        meals: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              time: { type: 'string' },
                              foods: {
                                type: 'array',
                                items: {
                                  type: 'object',
                                  properties: {
                                    name: { type: 'string' },
                                    quantity: { type: 'number' },
                                    unit: { type: 'string' },
                                    calories: { type: 'number' },
                                    protein: { type: 'number' },
                                    carbs: { type: 'number' },
                                    fats: { type: 'number' }
                                  },
                                  required: ['name', 'quantity', 'unit']
                                }
                              }
                            },
                            required: ['name', 'time', 'foods']
                          }
                        },
                        allowed_foods: { 
                          type: 'object',
                          additionalProperties: true
                        },
                        controlled_foods: { 
                          type: 'object',
                          additionalProperties: true
                        },
                        prohibited_foods: { 
                          type: 'object',
                          additionalProperties: true
                        },
                        daily_organization: { 
                          type: 'object',
                          additionalProperties: true
                        },
                        recommendations: { 
                          type: 'object',
                          additionalProperties: true
                        }
                      },
                      required: ['meals', 'allowed_foods', 'controlled_foods', 'prohibited_foods', 'daily_organization', 'recommendations']
                    }
                  },
                  required: ['title', 'diet_data']
                }
              },
              required: ['type', 'data']
            }
          },
          required: ['message', 'action']
        },
        strict: false // Allow natural language in message
      }
    }
  } else if (isMealPlanRequest) {
    // Add json_schema for meal planner requests
    requestBody.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'meal_planner_response',
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensaje natural explicando el meal plan creado'
            },
            action: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['OPEN_MEAL_PLANNER'],
                  description: 'Tipo de acción'
                },
                data: {
                  type: 'object',
                  properties: {
                    date: {
                      type: 'string',
                      description: 'Fecha en formato YYYY-MM-DD'
                    },
                    meals: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          time: { type: 'string' },
                          foods: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                name: { type: 'string' },
                                quantity: { type: 'number' },
                                unit: { type: 'string' },
                                calories: { type: 'number' },
                                protein: { type: 'number' },
                                carbs: { type: 'number' },
                                fats: { type: 'number' }
                              },
                              required: ['name', 'quantity', 'unit']
                            }
                          }
                        },
                        required: ['name', 'time', 'foods']
                      }
                    }
                  },
                  required: ['date', 'meals']
                }
              },
              required: ['type', 'data']
            }
          },
          required: ['message', 'action']
        },
        strict: false // Allow natural language in message
      }
    }
  }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!resp.ok) {
    const errorText = await resp.text()
    throw new Error(`OpenAI error ${resp.status}: ${errorText}`)
  }

  const data = await resp.json()
  let content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('OpenAI empty response')
  }

  // Para tareas complejas (dietas/entrenamientos), verificar completitud y hacer llamadas adicionales si es necesario
  if (isComplexRequest) {
    // VERIFICADOR DE DIETA: Si es una respuesta de dieta, verificar y completar
    if (isDietRequest && userContext?.goal && trainerMaterial.length > 0) {
      try {
        console.log('🔍 Verificando completitud de respuesta de dieta...')
        const verified = await verifyAndCompleteDietResponse(
          content,
          userContext.goal,
          trainerMaterial,
          3 // maxIterations - puede hacer hasta 3 llamadas adicionales si es necesario
        )
        
        if (verified.isComplete) {
          console.log('✅ Dieta verificada y completada correctamente')
          content = verified.completedResponse
        } else {
          console.log('⚠️ Dieta no se completó totalmente, pero se añadió lo posible')
          content = verified.completedResponse
        }
      } catch (error) {
        console.error('Error verificando dieta:', error)
        // Continuar con respuesta original si falla la verificación
      }
    }
    
    // Para entrenamientos complejos, verificar si la respuesta contiene el JSON completo
    if (isWorkoutRequest) {
      const hasWorkoutAction = content.includes('[ACTION:OPEN_WORKOUT:')
      const hasCompleteWorkoutData = content.includes('workout_data') && 
                                     (content.includes('days') || content.includes('ejercicios'))
      
      // Si falta información del entrenamiento, hacer una llamada adicional para completarlo
      if (hasWorkoutAction && !hasCompleteWorkoutData) {
        console.log('⚠️ Respuesta de entrenamiento incompleta, haciendo llamada adicional...')
        try {
          const completionPrompt = `El usuario pidió un entrenamiento pero la respuesta anterior está incompleta. 
Completa el entrenamiento con TODOS los días y ejercicios detallados según tu metodología.
Responde SOLO con el tag [ACTION:OPEN_WORKOUT:...] con el JSON completo.`
          
          const completionMessages = [
            ...systemMessages,
            ...conversationMessages,
            { role: 'assistant', content: content },
            { role: 'user', content: completionPrompt }
          ]
          
          const completionResp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-5.2', // Usar modelo potente para completar
              messages: completionMessages,
              temperature: trainer.slug === 'jey' ? 0.5 : 0.8 // gpt-5.2 sí soporta temperature personalizada
            })
          })
          
          if (completionResp.ok) {
            const completionData = await completionResp.json()
            const completionContent = completionData.choices?.[0]?.message?.content
            if (completionContent && completionContent.includes('[ACTION:OPEN_WORKOUT:')) {
              console.log('✅ Entrenamiento completado con llamada adicional')
              content = completionContent
            }
          }
        } catch (error) {
          console.error('Error completando entrenamiento:', error)
          // Continuar con respuesta original si falla
        }
      }
    }
  }

  // Añadir disclaimer de seguridad al final
  if (isDietRequest || isWorkoutRequest) {
    content += `\n\n---\n⚠️ Recordatorio: Este plan está basado en la información que compartiste y el material de ${trainer.name}. No sustituye el asesoramiento profesional. Si tienes condiciones médicas, lesiones o dudas, consulta con un profesional de la salud.`
  }

  // If response is in JSON format (from json_schema or natural JSON), convert to [ACTION:...] format
  if (isDietRequest || isMealPlanRequest || isWorkoutRequest) {
    try {
      // Try to parse as JSON first - puede estar al inicio o en medio del texto
      let jsonResponse: any = null
      let jsonString = ''
      
      if (typeof content === 'object') {
        jsonResponse = content
      } else if (typeof content === 'string') {
        // Buscar JSON en el contenido (puede estar al inicio o después de texto)
        const jsonMatch = content.match(/\{[\s\S]*"action"[\s\S]*\}/)
        if (jsonMatch) {
          jsonString = jsonMatch[0]
          try {
            jsonResponse = JSON.parse(jsonString)
            console.log('📋 JSON encontrado y parseado correctamente')
          } catch (parseError) {
            // Si falla, intentar parsear todo el contenido si empieza con {
            if (content.trim().startsWith('{')) {
              jsonResponse = JSON.parse(content)
            }
          }
        } else if (content.trim().startsWith('{')) {
          jsonResponse = JSON.parse(content)
        }
      }

      if (jsonResponse && jsonResponse.action) {
        const userMessage = jsonResponse.message || ''

        if (jsonResponse.action.type === 'OPEN_DIET') {
          // Convert JSON response to [ACTION:...] format for compatibility
          const actionData = JSON.stringify(jsonResponse.action.data)
          content = `${userMessage || 'Ya te he puesto la dieta completa. Revisa los detalles abajo.'} [ACTION:${jsonResponse.action.type}:${actionData}]`
          console.log('✅ Converted JSON schema response to ACTION format (DIET)')
        } else if (jsonResponse.action.type === 'OPEN_MEAL_PLANNER') {
          // Convert JSON response to [ACTION:...] format for compatibility
          const actionData = JSON.stringify(jsonResponse.action.data)
          content = `${userMessage || 'Ya te he planificado las comidas. Revisa los detalles abajo.'} [ACTION:${jsonResponse.action.type}:${actionData}]`
          console.log('✅ Converted JSON schema response to ACTION format (MEAL_PLANNER)')
        } else if (jsonResponse.action.type === 'OPEN_WORKOUT') {
          // Convert JSON response to [ACTION:...] format for compatibility
          // Verificar que data no esté vacío
          if (jsonResponse.action.data && Object.keys(jsonResponse.action.data).length > 0) {
            const actionData = JSON.stringify(jsonResponse.action.data)
            content = `${userMessage || 'Ya te he puesto el entrenamiento completo. Revisa los detalles abajo.'} [ACTION:${jsonResponse.action.type}:${actionData}]`
            console.log('✅ Converted JSON schema response to ACTION format (WORKOUT)')
          } else {
            console.error('⚠️ Respuesta de entrenamiento con data vacío:', jsonResponse)
            // Intentar extraer el mensaje aunque el data esté vacío
            content = userMessage || content
          }
        }
      } else if (jsonResponse && !jsonResponse.action) {
        // Si la respuesta es JSON pero no tiene el formato esperado, loguear para debug
        console.log('⚠️ Respuesta JSON sin formato action:', JSON.stringify(jsonResponse).substring(0, 200))
      }
    } catch (e) {
      // If parsing fails, check if content already has [ACTION:...] format
      if (typeof content === 'string' && (
        content.includes('[ACTION:OPEN_DIET:') || 
        content.includes('[ACTION:OPEN_MEAL_PLANNER:') ||
        content.includes('[ACTION:OPEN_WORKOUT:')
      )) {
        console.log('✅ Response already contains ACTION format')
      } else {
        console.error('⚠️ Error parsing JSON response, using content as is:', e)
        console.error('⚠️ Content preview:', typeof content === 'string' ? content.substring(0, 500) : content)
      }
    }
  }

  return content
}

