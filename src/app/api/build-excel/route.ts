import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

import { insertPlanRecord, type StoredPlanWeekSummary, type StoredPlanJson } from '@/lib/plan-storage'

export const runtime = 'nodejs'

const SPANISH_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const
const DAY_NORMALIZER: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miércoles: 'Miércoles',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sábado: 'Sábado',
  sabado: 'Sábado',
  domingo: 'Domingo'
}

type BuildRequest = {
  trainerSlug: string
  profile: {
    fullName: string
    sex: string
    height_cm: number
    weight_kg: number
    goal: string
  }
  availability: {
    daysPerWeek: number
    cannotTrain: string[]
  }
  intensity: number
}

// Edu-specific types for structured templates
type EduExercise = {
  name: string
  primaryMuscle: string
  sets: number
  reps: string // e.g. "6-8", "10-12"
  rir: string // e.g. "1-2 RIR", "2-3 RIR"
  notes?: string
}

type EduWorkoutTemplateCode = 'PUSH_A' | 'PULL_A' | 'LEGS_A' | 'PUSH_B' | 'PULL_B' | 'LEGS_B'

type EduWorkoutTemplate = {
  code: EduWorkoutTemplateCode
  label: string // e.g. "Push A (Pectoral/Hombro/Tríceps)"
  focus: string // short description (e.g. "Foco en press pesado")
  exercises: EduExercise[]
}

type EduWeekPlan = {
  weekIndex: number // 0-based
  weekLabel: string // e.g. "Semana 1"
  days: {
    dayLabel: string // e.g. "Día 1", "Día 2"
    templateCode: EduWorkoutTemplateCode
    progressionNote: string
  }[]
}

// Legacy types (kept for compatibility if needed)
type Exercise = {
  exercise: string
  sets: string
  reps: string
  notes: string
}

type DayPlan =
  | {
      day: string
      routine: 'OFF'
      exercises: Exercise[]
    }
  | {
      day: string
      routine: string
      exercises: Exercise[]
    }

// Edu workout templates for structured bodybuilding program
const EDU_WORKOUT_TEMPLATES: EduWorkoutTemplate[] = [
  {
    code: 'PUSH_A',
    label: 'Push A (Pectoral/Hombro/Tríceps)',
    focus: 'Foco en press pesado',
    exercises: [
      { name: 'Press banca con barra', primaryMuscle: 'Pectoral', sets: 4, reps: '6-8', rir: '1-2 RIR', notes: 'Compuesto principal' },
      { name: 'Press inclinado con mancuernas', primaryMuscle: 'Pectoral superior', sets: 3, reps: '8-10', rir: '1-2 RIR' },
      { name: 'Press militar', primaryMuscle: 'Hombro frontal', sets: 4, reps: '6-8', rir: '1-2 RIR', notes: 'Pie o sentado' },
      { name: 'Fondos lastrados', primaryMuscle: 'Tríceps/Pectoral', sets: 3, reps: '6-10', rir: '1-2 RIR' },
      { name: 'Extensión de tríceps en polea', primaryMuscle: 'Tríceps', sets: 3, reps: '10-12', rir: '2-3 RIR' },
      { name: 'Elevaciones laterales', primaryMuscle: 'Hombro lateral', sets: 4, reps: '12-15', rir: '2-3 RIR' }
    ]
  },
  {
    code: 'PULL_A',
    label: 'Pull A (Espalda/Bíceps)',
    focus: 'Foco en tracción pesada',
    exercises: [
      { name: 'Peso muerto rumano', primaryMuscle: 'Espalda baja/Isquios', sets: 4, reps: '6-8', rir: '1-2 RIR', notes: 'O RDL si prefieres' },
      { name: 'Dominadas lastradas', primaryMuscle: 'Dorsales', sets: 4, reps: '6-8', rir: '1-2 RIR' },
      { name: 'Remo con barra', primaryMuscle: 'Dorsales medio', sets: 4, reps: '8-10', rir: '1-2 RIR' },
      { name: 'Remo horizontal en máquina', primaryMuscle: 'Dorsales', sets: 3, reps: '10-12', rir: '2-3 RIR' },
      { name: 'Face pulls', primaryMuscle: 'Hombro posterior', sets: 3, reps: '12-15', rir: '2-3 RIR' },
      { name: 'Curl de bíceps con barra', primaryMuscle: 'Bíceps', sets: 3, reps: '10-12', rir: '2-3 RIR' }
    ]
  },
  {
    code: 'LEGS_A',
    label: 'Legs A (Pierna completa)',
    focus: 'Foco en sentadilla pesada',
    exercises: [
      { name: 'Sentadilla trasera', primaryMuscle: 'Cuádriceps', sets: 4, reps: '6-8', rir: '1-2 RIR', notes: 'Compuesto principal' },
      { name: 'Prensa de piernas', primaryMuscle: 'Cuádriceps', sets: 4, reps: '8-12', rir: '1-2 RIR' },
      { name: 'Peso muerto rumano con mancuernas', primaryMuscle: 'Isquiotibiales', sets: 3, reps: '10-12', rir: '2-3 RIR' },
      { name: 'Zancadas caminando', primaryMuscle: 'Cuádriceps/Glúteos', sets: 3, reps: '12-14', rir: '2-3 RIR' },
      { name: 'Curl femoral', primaryMuscle: 'Isquiotibiales', sets: 3, reps: '12-15', rir: '2-3 RIR' },
      { name: 'Elevación de gemelos', primaryMuscle: 'Gemelos', sets: 4, reps: '15-20', rir: '2-3 RIR' }
    ]
  },
  {
    code: 'PUSH_B',
    label: 'Push B (Pectoral/Hombro/Tríceps)',
    focus: 'Más volumen y ángulos',
    exercises: [
      { name: 'Press inclinado con barra', primaryMuscle: 'Pectoral superior', sets: 4, reps: '8-10', rir: '1-2 RIR', notes: 'Variación de ángulo' },
      { name: 'Aperturas con mancuernas', primaryMuscle: 'Pectoral', sets: 3, reps: '10-12', rir: '2-3 RIR' },
      { name: 'Press en máquina', primaryMuscle: 'Pectoral/Hombro', sets: 3, reps: '10-12', rir: '2-3 RIR' },
      { name: 'Elevaciones laterales con mancuernas', primaryMuscle: 'Hombro lateral', sets: 4, reps: '12-15', rir: '2-3 RIR' },
      { name: 'Elevaciones frontales', primaryMuscle: 'Hombro frontal', sets: 3, reps: '12-15', rir: '2-3 RIR' },
      { name: 'Extensión de tríceps en banco', primaryMuscle: 'Tríceps', sets: 3, reps: '10-12', rir: '2-3 RIR' },
      { name: 'Press francés', primaryMuscle: 'Tríceps', sets: 3, reps: '10-12', rir: '2-3 RIR' }
    ]
  },
  {
    code: 'PULL_B',
    label: 'Pull B (Espalda/Bíceps)',
    focus: 'Más volumen y variaciones',
    exercises: [
      { name: 'Remo horizontal en banco inclinado', primaryMuscle: 'Dorsales', sets: 4, reps: '8-10', rir: '2-3 RIR', notes: 'Espalda apoyada' },
      { name: 'Jalón al pecho', primaryMuscle: 'Dorsales', sets: 4, reps: '8-10', rir: '2-3 RIR' },
      { name: 'Remo con mancuerna a un brazo', primaryMuscle: 'Dorsales', sets: 3, reps: '10-12', rir: '2-3 RIR', notes: 'Cada lado' },
      { name: 'Face pulls en polea', primaryMuscle: 'Hombro posterior', sets: 3, reps: '12-15', rir: '2-3 RIR' },
      { name: 'Encogimientos de hombros', primaryMuscle: 'Trapecio', sets: 3, reps: '10-12', rir: '2-3 RIR' },
      { name: 'Curl de bíceps con mancuernas', primaryMuscle: 'Bíceps', sets: 3, reps: '10-12', rir: '2-3 RIR' },
      { name: 'Curl martillo', primaryMuscle: 'Bíceps/Braquial', sets: 3, reps: '10-12', rir: '2-3 RIR' }
    ]
  },
  {
    code: 'LEGS_B',
    label: 'Legs B (Unilateral y cadena posterior)',
    focus: 'Unilateral y trabajo de glúteos',
    exercises: [
      { name: 'Sentadilla búlgara', primaryMuscle: 'Cuádriceps/Glúteos', sets: 3, reps: '10-12', rir: '2-3 RIR', notes: 'Cada pierna' },
      { name: 'Hip thrust', primaryMuscle: 'Glúteos', sets: 4, reps: '8-12', rir: '1-2 RIR' },
      { name: 'Peso muerto rumano', primaryMuscle: 'Isquiotibiales/Glúteos', sets: 3, reps: '8-10', rir: '2-3 RIR' },
      { name: 'Curl femoral tumbado', primaryMuscle: 'Isquiotibiales', sets: 3, reps: '12-15', rir: '2-3 RIR' },
      { name: 'Extensiones de cuádriceps', primaryMuscle: 'Cuádriceps', sets: 3, reps: '12-15', rir: '2-3 RIR' },
      { name: 'Elevación de gemelos sentado', primaryMuscle: 'Gemelos', sets: 4, reps: '15-20', rir: '2-3 RIR' },
      { name: 'Abducción de cadera en máquina', primaryMuscle: 'Glúteos', sets: 3, reps: '12-15', rir: '2-3 RIR' }
    ]
  }
]

// Legacy BASE_SPLIT (kept for reference, not used in new implementation)
const BASE_SPLIT: { routine: string; exercises: Exercise[] }[] = [
  {
    routine: 'Push',
    exercises: [
      { exercise: 'Press banca', sets: '4', reps: '6-8', notes: 'RIR 1-2' },
      { exercise: 'Press militar', sets: '4', reps: '8-10', notes: 'RIR 1-2' },
      { exercise: 'Fondos lastrados', sets: '3', reps: '6-10', notes: 'RIR 1-2' },
      { exercise: 'Press inclinado mancuernas', sets: '3', reps: '10-12', notes: 'RIR 2-3' },
      { exercise: 'Elevaciones laterales', sets: '4', reps: '12-15', notes: 'RIR 2-3' },
      { exercise: 'Extensión tríceps cuerda', sets: '3', reps: '12-15', notes: 'RIR 2-3' }
    ]
  },
  {
    routine: 'Pull',
    exercises: [
      { exercise: 'Peso muerto rumano', sets: '4', reps: '6-8', notes: 'RIR 1-2' },
      { exercise: 'Dominadas lastradas', sets: '4', reps: '6-8', notes: 'RIR 1-2' },
      { exercise: 'Remo con barra', sets: '4', reps: '8-10', notes: 'RIR 1-2' },
      { exercise: 'Remo en máquina', sets: '3', reps: '10-12', notes: 'RIR 2-3' },
      { exercise: 'Face pulls', sets: '3', reps: '12-15', notes: 'RIR 2-3' },
      { exercise: 'Curl bíceps barra', sets: '3', reps: '10-12', notes: 'RIR 2-3' }
    ]
  },
  {
    routine: 'Legs',
    exercises: [
      { exercise: 'Sentadilla trasera', sets: '4', reps: '6-8', notes: 'RIR 1-2' },
      { exercise: 'Prensa', sets: '4', reps: '8-12', notes: 'RIR 1-2' },
      { exercise: 'Peso muerto rumano mancuerna', sets: '3', reps: '10-12', notes: 'RIR 2-3' },
      { exercise: 'Zancadas caminando', sets: '3', reps: '12-14', notes: 'RIR 2-3' },
      { exercise: 'Curl femoral', sets: '3', reps: '12-15', notes: 'RIR 2-3' },
      { exercise: 'Elevación de gemelos', sets: '4', reps: '15-20', notes: 'RIR 2-3' }
    ]
  }
]

function normaliseCannotTrain(days: string[]): Set<string> {
  const set = new Set<string>()
  days.forEach((day) => {
    const key = day.trim().toLowerCase()
    const mapped = DAY_NORMALIZER[key]
    if (mapped) set.add(mapped)
  })
  return set
}

// Get progression note based on week and intensity
function getEduProgressionNote(weekIndex: number, intensity: number): string {
  const isLowIntensity = intensity <= 5
  const isHighIntensity = intensity >= 8

  // Weeks 0-2 (Weeks 1-3): Intro / baseline
  if (weekIndex < 3) {
    if (isLowIntensity) {
      return 'Construye técnica y control del movimiento. Enfócate en control y sostenibilidad. Añade repeticiones poco a poco manteniendo 2-3 RIR.'
    }
    if (isHighIntensity) {
      return 'Construye técnica y control del movimiento. Añade repeticiones poco a poco manteniendo 2-3 RIR. Controla la forma pero no tengas miedo a apretar.'
    }
    return 'Construye técnica y control del movimiento. Añade repeticiones poco a poco manteniendo 2-3 RIR.'
  }

  // Weeks 3-5 (Weeks 4-6): Overload
  if (weekIndex < 6) {
    if (isLowIntensity) {
      return 'Mantén la técnica y sube ligeramente el peso (2-5%) o la dificultad mientras mantienes 2-3 RIR. Prioriza control y sostenibilidad.'
    }
    if (isHighIntensity) {
      return 'Mantén la técnica y sube ligeramente el peso (2-5%) o la dificultad mientras mantienes 1-2 RIR. Aprieta fuerte pero sin romper técnica.'
    }
    return 'Mantén la técnica y sube ligeramente el peso (2-5%) o la dificultad mientras mantienes 1-2 RIR.'
  }

  // Week 6 (Week 7): Deload
  if (weekIndex === 6) {
    if (isLowIntensity) {
      return 'Semana de descarga. Reduce peso ~20-30%, mismas repeticiones, más sensación de facilidad. Ideal para recuperación y consolidación.'
    }
    if (isHighIntensity) {
      return 'Semana de descarga. Reduce peso ~20-30%, mismas repeticiones, más sensación de facilidad. Úsala para recargar sin perder el hábito.'
    }
    return 'Semana de descarga. Reduce peso ~20-30%, mismas repeticiones, más sensación de facilidad.'
  }

  // Weeks 7-8 (Weeks 8-9): Rebuild / peak
  if (isLowIntensity) {
    return 'Retoma pesos de semanas 4-6 y trata de mejorar 1-2 repeticiones con técnica perfecta. Control y calidad por encima de peso máximo.'
  }
  if (isHighIntensity) {
    return 'Retoma pesos de semanas 4-6 y trata de mejorar 1-2 repeticiones con técnica perfecta. Aprieta al máximo pero sin comprometer la forma.'
  }
  return 'Retoma pesos de semanas 4-6 y trata de mejorar 1-2 repeticiones con técnica perfecta.'
}

// Build 9-week plan based on availability and intensity
function buildEduWeekPlans(params: { daysPerWeek: number; intensity: number }): EduWeekPlan[] {
  const { daysPerWeek, intensity } = params
  const actualDays = Math.max(1, Math.min(daysPerWeek, 6))

  // Define template pattern based on days per week
  let templatePattern: EduWorkoutTemplateCode[] = []
  if (actualDays <= 3) {
    templatePattern = ['PUSH_A', 'PULL_A', 'LEGS_A']
  } else if (actualDays === 4) {
    templatePattern = ['PUSH_A', 'PULL_A', 'LEGS_A', 'PUSH_B']
  } else if (actualDays === 5) {
    templatePattern = ['PUSH_A', 'PULL_A', 'LEGS_A', 'PUSH_B', 'PULL_B']
  } else {
    // >= 6
    templatePattern = ['PUSH_A', 'PULL_A', 'LEGS_A', 'PUSH_B', 'PULL_B', 'LEGS_B']
  }

  const weekPlans: EduWeekPlan[] = []

  for (let weekIndex = 0; weekIndex < 9; weekIndex += 1) {
    const progressionNote = getEduProgressionNote(weekIndex, intensity)

    const days = templatePattern.map((templateCode, dayIndex) => ({
      dayLabel: `Día ${dayIndex + 1}`,
      templateCode,
      progressionNote
    }))

    weekPlans.push({
      weekIndex,
      weekLabel: `Semana ${weekIndex + 1}`,
      days
    })
  }

  return weekPlans
}

function buildWeeklyPlan(availability: BuildRequest['availability']): DayPlan[] {
  const cannotSet = normaliseCannotTrain(availability.cannotTrain ?? [])
  const requestedDays = Math.max(1, Math.min(availability.daysPerWeek ?? 3, 6))
  const availableSlots = SPANISH_DAYS.filter((day) => !cannotSet.has(day)).length
  const actualTrainingDays = Math.min(requestedDays, availableSlots)

  let splitIndex = 0
  let assigned = 0

  const plan: DayPlan[] = SPANISH_DAYS.map((day) => {
    if (cannotSet.has(day)) {
      return { day, routine: 'OFF', exercises: [] }
    }
    if (assigned < actualTrainingDays) {
      const split = BASE_SPLIT[splitIndex % BASE_SPLIT.length]
      assigned += 1
      splitIndex += 1
      return { day, routine: split.routine, exercises: split.exercises }
    }
    return { day, routine: 'OFF', exercises: [] }
  })

  return plan
}

// New function to populate worksheet using Edu templates
function populateEduWorksheet(ws: ExcelJS.Worksheet, weekPlan: EduWeekPlan) {
  ws.columns = [
    { header: 'Día', key: 'day', width: 12 },
    { header: 'Tipo de rutina', key: 'routineType', width: 24 },
    { header: 'Ejercicio', key: 'exercise', width: 32 },
    { header: 'Músculo principal', key: 'muscle', width: 20 },
    { header: 'Series', key: 'sets', width: 8 },
    { header: 'Reps', key: 'reps', width: 12 },
    { header: 'RIR', key: 'rir', width: 12 },
    { header: 'Notas / progresión', key: 'notes', width: 40 }
  ]

  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, size: 12 }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  headerRow.height = 25

  weekPlan.days.forEach((day) => {
    const template = EDU_WORKOUT_TEMPLATES.find((t) => t.code === day.templateCode)
    if (!template) return

    template.exercises.forEach((exercise, exerciseIndex) => {
      const row = ws.addRow({
        day: exerciseIndex === 0 ? day.dayLabel : '',
        routineType: exerciseIndex === 0 ? template.label : '',
        exercise: exercise.name,
        muscle: exercise.primaryMuscle,
        sets: exercise.sets,
        reps: exercise.reps,
        rir: exercise.rir,
        notes: exerciseIndex === 0 ? day.progressionNote : exercise.notes || ''
      })

      // Bold first row of each day
      if (exerciseIndex === 0) {
        row.getCell('day').font = { bold: true }
        row.getCell('routineType').font = { bold: true }
      }
    })

    // Add empty row between days
    ws.addRow([])
  })

  // Remove last empty row
  const lastRow = ws.lastRow
  if (lastRow && !lastRow.getCell(1).value) {
    ws.spliceRows(lastRow.number, 1)
  }

  // Apply borders and formatting to all cells
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      }
      if (!cell.font) {
        cell.font = { name: 'Calibri', size: 11 }
      }
      cell.alignment = { vertical: 'middle', wrapText: true }
    })
  })
}

// Legacy function (kept for reference, not used in new implementation)
function populateWorksheet(ws: ExcelJS.Worksheet, plan: DayPlan[], weekNumber: number) {
  ws.columns = [
    { header: 'Día', key: 'day', width: 16 },
    { header: 'Rutina', key: 'routine', width: 18 },
    { header: 'Ejercicio', key: 'exercise', width: 32 },
    { header: 'Series', key: 'sets', width: 10 },
    { header: 'Reps', key: 'reps', width: 12 },
    { header: 'Notas', key: 'notes', width: 34 }
  ]

  ws.getRow(1).font = { bold: true }
  ws.getRow(1).alignment = { horizontal: 'center' }

  plan.forEach((dayPlan) => {
    if (dayPlan.routine === 'OFF') {
      const row = ws.addRow({
        day: dayPlan.day,
        routine: 'OFF / Recuperación',
        exercise: '',
        sets: '',
        reps: '',
        notes: 'Movilidad ligera o descanso activo'
      })
      row.font = { italic: true }
    } else {
      dayPlan.exercises.forEach((exercise, index) => {
        const row = ws.addRow({
          day: index === 0 ? dayPlan.day : '',
          routine: index === 0 ? dayPlan.routine : '',
          exercise: exercise.exercise,
          sets: exercise.sets,
          reps: exercise.reps,
          notes: `${exercise.notes} | +2.5–5% vs semana anterior si RIR≤1`
        })
        if (index === 0) {
          row.font = { bold: true }
        }
      })
    }
  })

  ws.addRow([])
  ws.addRow({
    day: '',
    routine: '',
    exercise: '',
    sets: '',
    reps: '',
    notes: `Semana ${weekNumber}: Registra cargas y mantén el objetivo de RIR programado.`
  }).font = { italic: true }

  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      }
      if (!cell.font) {
        cell.font = { name: 'Calibri', size: 11 }
      }
    })
  })
}

async function buildWorkbook(payload: BuildRequest) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GymRatIA'
  workbook.created = new Date()

  const portada = workbook.addWorksheet('Portada')
  portada.columns = [{ header: '', key: 'label', width: 28 }, { header: '', key: 'value', width: 40 }]

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

  portada.addRow(['Plan de Entrenamiento - 9 Semanas', '']).font = { bold: true, size: 20 }
  portada.mergeCells('A1:B1')
  portada.getCell('A1').alignment = { horizontal: 'center' }

  portada.addRow([])
  portada.addRow(['Atleta', payload.profile.fullName])
  portada.addRow(['Entrenador', 'Edu'])
  portada.addRow(['Fecha', dateStr])
  portada.addRow(['Objetivo', payload.profile.goal])
  portada.addRow(['Altura', `${payload.profile.height_cm} cm`])
  portada.addRow(['Peso', `${payload.profile.weight_kg} kg`])
  portada.addRow(['Intensidad objetivo', `${payload.intensity}/10`])
  portada.addRow(['Días por semana', `${payload.availability.daysPerWeek}`])

  portada.eachRow((row) => {
    row.eachCell((cell) => {
      cell.font = cell.font ?? { name: 'Calibri', size: 12 }
    })
  })

  // Build 9-week plan using new Edu templates
  const daysPerWeek = payload.availability.daysPerWeek > 0 ? payload.availability.daysPerWeek : 3
  const weekPlans = buildEduWeekPlans({
    daysPerWeek,
    intensity: payload.intensity
  })

  for (const weekPlan of weekPlans) {
    const sheet = workbook.addWorksheet(weekPlan.weekLabel)
    populateEduWorksheet(sheet, weekPlan)
  }

  return workbook
}

async function insertEduPlan(payload: BuildRequest) {
  try {
    const { profile, availability, intensity } = payload

    // Build week plan summary for storage
    const daysPerWeek = availability.daysPerWeek > 0 ? availability.daysPerWeek : 3
    const weekPlans = buildEduWeekPlans({
      daysPerWeek,
      intensity
    })

    const weekSummary: StoredPlanWeekSummary[] = weekPlans.flatMap((week) =>
      week.days.map((day, dayIndex) => {
        const template = EDU_WORKOUT_TEMPLATES.find((t) => t.code === day.templateCode)
        return {
          week: week.weekIndex + 1,
          day: dayIndex + 1,
          dayLabel: day.dayLabel,
          templateCode: day.templateCode,
          templateLabel: template?.label,
          progressionNote: day.progressionNote
        }
      })
    )

    const storedPlan: StoredPlanJson = {
      version: 'v1',
      source: 'excel',
      trainerSlug: 'edu',
      trainerId: null, // will be filled by insertPlanRecord
      profile: {
        fullName: profile.fullName,
        sex: profile.sex,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        goal: profile.goal
      },
      availability: {
        daysPerWeek: availability.daysPerWeek,
        cannotTrain: availability.cannotTrain
      },
      intensity,
      weekSummary
    }

    const insertResult = await insertPlanRecord({
      title: 'Plan Edu 9 semanas',
      trainerSlug: 'edu',
      storedPlan,
      nutritionJson: { tips: ['Alta proteína', 'Sueño 7-9h', 'Progresión carga'] },
      techniqueJson: { notes: 'Calentamiento, técnica estricta, RIR objetivo' }
    })

    if (!insertResult.ok) {
      console.error('Failed to insert plan:', insertResult.planId)
    }
  } catch (error) {
    console.error('Supabase insert unexpected error', error)
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BuildRequest

    if (!body || body.trainerSlug !== 'edu') {
      return NextResponse.json({ ok: false, error: 'Sólo disponible para Edu' }, { status: 400 })
    }

    if (
      !body.profile ||
      !body.profile.fullName ||
      !body.profile.goal ||
      typeof body.profile.height_cm !== 'number' ||
      typeof body.profile.weight_kg !== 'number'
    ) {
      return NextResponse.json({ ok: false, error: 'Perfil incompleto' }, { status: 400 })
    }

    if (!body.availability || typeof body.availability.daysPerWeek !== 'number') {
      return NextResponse.json({ ok: false, error: 'Disponibilidad inválida' }, { status: 400 })
    }

    const workbook = await buildWorkbook(body)
    insertEduPlan(body).catch(() => {
      /* handled inside */
    })

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="plan_edu_9_semanas.xlsx"'
      }
    })
  } catch (error: any) {
    console.error('build-excel error', error)
    return NextResponse.json({ ok: false, error: error?.message ?? 'unknown' }, { status: 500 })
  }
}

