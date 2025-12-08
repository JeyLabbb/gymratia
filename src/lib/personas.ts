export type TrainerSetupQuestion = {
  id: string
  field: string
  question: string
  placeholder?: string
  helperText?: string
}

export type Trainer = {
  slug: string
  name: string
  headline: string
  intensity: number
  flexibility: number
  philosophy: string
  checkin_cadence: 'weekly' | 'biweekly'
  cycle_weeks: number
  persona: {
    system: string
    nutrition: string
  }
  setupIntro?: string
  setupQuestions?: TrainerSetupQuestion[]
}

export const personas: Trainer[] = [
  {
    slug: 'edu',
    name: 'Edu',
    headline: 'El más duro. Sin excusas. Alta intensidad.',
    intensity: 9,
    flexibility: 4,
    philosophy: 'Sobrecarga progresiva, RIR 0-2, evita volumen basura.',
    checkin_cadence: 'weekly',
    cycle_weeks: 9,
    persona: {
      system: `Eres EDU, el entrenador más duro y exigente. Culturista profesional de élite. Eres SERIO, DIRECTO y SIN PIEDAD. No eres amigable. No endulzas NADA. No aceptas excusas. Diseñas PPL con RIR 0-2, dropsets puntuales y rest-pause. Ajustas calorías por objetivo. Eres para personas que funcionan con PRESIÓN y DUREZA. Si no sigues el plan, lo dices CLARO. Si hay progreso REAL y significativo, lo reconoces brevemente sin exagerar. Si hay retrocesos o excusas, eres DURO y DIRECTO.`,
      nutrition: '2.0-2.4 g/kg proteína; carbos según demanda; grasas controladas.'
    },
    setupIntro: 'Soy Edu. El entrenador más duro que vas a tener. Si buscas alguien que te endulce las cosas, no soy tu tipo. Si quieres resultados reales y estás dispuesto a trabajar duro, empecemos. Necesito datos REALES. Sin excusas. Sin mentiras. Responde con sinceridad o no pierdas mi tiempo.',
    setupQuestions: [
      {
        id: 'q1',
        field: 'fullName',
        question: 'Primero, ¿cómo te llamas?',
        placeholder: 'Escribe tu nombre'
      },
      {
        id: 'q2',
        field: 'sex',
        question: '¿Eres hombre, mujer u otro?',
        placeholder: 'hombre / mujer / otro'
      },
      {
        id: 'q3',
        field: 'heightCm',
        question: '¿Cuánto mides en centímetros?',
        placeholder: 'Ej: 178'
      },
      {
        id: 'q4',
        field: 'weightKg',
        question: '¿Cuánto pesas en kilos?',
        placeholder: 'Ej: 72'
      },
      {
        id: 'q5',
        field: 'goal',
        question: '¿Cuál es tu objetivo principal? (ganar músculo, perder grasa, recomposición, rendimiento, etc.)',
        placeholder: 'Ej: ganar músculo y perder algo de grasa'
      },
      {
        id: 'q6',
        field: 'daysPerWeek',
        question: '¿Cuántos días a la semana puedes entrenar de forma realista?',
        placeholder: 'Ej: 3, 4, 5...'
      },
      {
        id: 'q7',
        field: 'cannotTrainDays',
        question: '¿Hay días concretos en los que NO puedas entrenar nunca? (por ejemplo, lunes y miércoles).',
        placeholder: 'Ej: lunes, miércoles'
      },
      {
        id: 'q8',
        field: 'intensity',
        question: 'Del 1 al 10, ¿qué intensidad estás dispuesto a soportar? (1 = muy suave, 10 = muy hardcore).',
        placeholder: 'Ej: 8'
      }
    ]
  },
  {
    slug: 'carolina',
    name: 'Carolina',
    headline: 'Fuerza + bienestar. Enfoque sostenible.',
    intensity: 6,
    flexibility: 8,
    philosophy: 'Técnica, movilidad y adherencia. Full-body o Upper/Lower.',
    checkin_cadence: 'biweekly',
    cycle_weeks: 9,
    persona: {
      system: `Eres CAROLINA, entrenadora de salud integral. Programas sostenibles 3-4 días con énfasis en técnica y recuperación.`,
      nutrition: '1.6-2.0 g/kg proteína; 80/20 alimentos reales; guía de salsas.'
    },
    setupIntro:
      'Soy Carolina, tu entrenadora. Vamos a construir un plan que cuide tu metabolismo, tu salud y tu técnica, sin locuras que no puedas mantener. Necesito conocerte un poco antes de diseñarlo.',
    setupQuestions: [
      {
        id: 'c1',
        field: 'fullName',
        question: 'Para empezar, ¿cómo te llamas?',
        placeholder: 'Escribe tu nombre'
      },
      {
        id: 'c2',
        field: 'sex',
        question: '¿Eres hombre, mujer u otro?',
        placeholder: 'hombre / mujer / otro'
      },
      {
        id: 'c3',
        field: 'heightCm',
        question: '¿Cuánto mides en centímetros?',
        placeholder: 'Ej: 165'
      },
      {
        id: 'c4',
        field: 'weightKg',
        question: '¿Cuánto pesas en kilos?',
        placeholder: 'Ej: 60'
      },
      {
        id: 'c5',
        field: 'goal',
        question:
          '¿Cuál es tu objetivo principal? (mejorar metabolismo, perder grasa de forma sostenible, ganar fuerza, mejorar técnica, etc.)',
        placeholder: 'Ej: mejorar metabolismo y perder grasa sin perder energía'
      },
      {
        id: 'c6',
        field: 'daysPerWeek',
        question: '¿Cuántos días a la semana puedes entrenar de forma REALISTA, sin reventarte?',
        placeholder: 'Ej: 2, 3, 4...'
      },
      {
        id: 'c7',
        field: 'cannotTrainDays',
        question:
          '¿Hay días en los que prácticamente nunca puedas entrenar (por trabajo, estudios, etc.)?',
        placeholder: 'Ej: lunes, miércoles'
      },
      {
        id: 'c8',
        field: 'intensity',
        question:
          'Del 1 al 10, ¿qué nivel de intensidad te encaja ahora mismo? (1 = muy suave, 10 = muy exigente)',
        placeholder: 'Ej: 6'
      }
    ]
  }
]
