/**
 * Guardrail único para avisos de salud.
 * Solo muestra warning corto en triggers GRAVES.
 * No mega disclaimer en conversaciones normales.
 */

export type SeriousHealthTrigger =
  | 'symptoms_severe'
  | 'injury_acute'
  | 'eating_disorder'
  | 'mental_crisis'
  | 'medical_request'

const TRIGGERS = {
  // Síntomas graves, urgencias
  symptoms_severe: [
    'dolor torácico', 'dolor de pecho', 'dolor en el pecho',
    'desmayo', 'desmayos', 'mareos fuertes', 'mareo intenso',
    'hemorragia', 'sangrado abundante', 'sangre en',
    'falta de aire', 'no puedo respirar', 'dificultad para respirar',
    'ideación suicida', 'quiero matarme', 'pensamientos suicidas',
    'infarto', 'ataque al corazón', 'paro cardiaco',
    'embolia', 'accidente cerebrovascular', 'ictus',
  ],
  // Lesión activa con dolor fuerte / inflamación aguda / sospecha rotura
  injury_acute: [
    'sospecha de rotura', 'creo que me rompí', 'me he roto',
    'inflamación aguda', 'muy inflamado', 'hinchazón fuerte',
    'dolor fuerte', 'dolor intenso', 'dolor agudo',
    'no puedo mover', 'no puedo apoyar', 'no soporto el dolor',
    'esguince grave', 'rotura de', 'fractura',
  ],
  // Trastornos alimentarios o conductas de riesgo
  eating_disorder: [
    'anorexia', 'bulimia', 'trastorno alimentario', 'trastorno de la conducta alimentaria',
    'no como nada', 'vomito después de comer', 'purgas', 'me purgo',
    'obsesión con la comida', 'miedo obsesivo a engordar',
    'restricción extrema', 'ayuno prolongado peligroso',
  ],
  // Crisis mental
  mental_crisis: [
    'quiero matarme', 'pensamientos de suicidio', 'ideación suicida',
    'no quiero vivir', 'autolesión', 'me corto', 'me hago daño',
  ],
  // Pide diagnósticos o tratamientos médicos
  medical_request: [
    'diagnóstico', 'diagnósticame', 'qué enfermedad tengo',
    'tratamiento médico', 'medicación para', 'receta',
    'prescríbeme', 'qué medicamento', 'qué pastilla',
  ],
}

/**
 * Determina si debe mostrarse un warning de salud (solo en casos graves).
 * Conversaciones normales de dieta/entreno/motivación NO activan.
 */
export function shouldShowHealthWarning(message: string): SeriousHealthTrigger[] {
  const lower = message.toLowerCase().trim()
  const triggers: SeriousHealthTrigger[] = []

  for (const [key, keywords] of Object.entries(TRIGGERS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      triggers.push(key as SeriousHealthTrigger)
    }
  }

  return triggers
}

/**
 * Genera un aviso corto (2-4 líneas) para mostrar solo cuando hay trigger grave.
 * No el mega bloque kilométrico.
 */
export function renderShortHealthWarning(triggers: SeriousHealthTrigger[]): string {
  if (triggers.length === 0) return ''

  if (triggers.includes('mental_crisis') || triggers.includes('symptoms_severe')) {
    return '⚠️ Lo que comentas requiere atención urgente. Por favor, contacta con un profesional sanitario o con los servicios de emergencia (112 en España).'
  }
  if (triggers.includes('eating_disorder')) {
    return '⚠️ Si estás pasando por un trastorno alimentario, es importante que hables con un profesional de la salud. Puedo darte información general, pero no sustituyo su ayuda.'
  }
  if (triggers.includes('injury_acute')) {
    return '⚠️ Con una lesión activa o dolor fuerte, conviene que un fisio o médico te dé el alta antes de entrenar. Cuando tengas su visto bueno, puedo ayudarte a adaptar ejercicios.'
  }
  if (triggers.includes('medical_request')) {
    return '⚠️ No puedo diagnosticar ni prescribir tratamientos. Para eso necesitas consultar con un médico o profesional sanitario.'
  }

  return '⚠️ Si tienes dudas de salud, consulta con un profesional antes de seguir cualquier plan.'
}

/**
 * Evita repetir el warning en mensajes consecutivos.
 * Si el último mensaje del asistente ya contenía un aviso de salud, no repetir.
 */
export function lastMessageHadHealthWarning(messages: Array<{ role: string; content: string }>): boolean {
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
  if (!lastAssistant?.content) return false
  const content = lastAssistant.content.toLowerCase()
  return (
    content.includes('⚠️') &&
    (content.includes('profesional') ||
      content.includes('médico') ||
      content.includes('urgente') ||
      content.includes('112'))
  )
}
