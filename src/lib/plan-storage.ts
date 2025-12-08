import { supabase } from '@/lib/supabase'
import type { PlanType as StructuredPlan } from '@/lib/schemas'

export type StoredPlanSource = 'json' | 'excel'

export type StoredPlanWeekSummary = {
  week: number // 1-9
  day: number // 1..daysPerWeek
  dayLabel: string // e.g. "Día 1"
  templateCode?: string // e.g. "PUSH_A", "FULL_BODY", etc.
  templateLabel?: string // human label, e.g. "Push A (Pectoral/Hombro/Tríceps)"
  progressionNote?: string
}

export type StoredPlanProfile = {
  fullName?: string
  sex?: string
  height_cm?: number
  weight_kg?: number
  goal?: string
  notes?: string // free text from chat
}

export type StoredPlanAvailability = {
  daysPerWeek?: number
  cannotTrain?: string[]
}

export type StoredPlanJson = {
  version: 'v1'
  source: StoredPlanSource
  trainerSlug: string
  trainerId: number | null

  profile?: StoredPlanProfile
  availability?: StoredPlanAvailability
  intensity?: number

  // For AI/JSON plans:
  structuredPlan?: StructuredPlan

  // For Excel-based plans (Edu):
  weekSummary?: StoredPlanWeekSummary[]
}

export async function insertPlanRecord(params: {
  title: string
  trainerSlug: string
  storedPlan: StoredPlanJson
  nutritionJson?: unknown
  techniqueJson?: unknown
}) {
  // Resolve trainer_id from the trainers table, if possible
  const { data: trainerRow, error: trainerError } = await supabase
    .from('trainers')
    .select('id, slug')
    .eq('slug', params.trainerSlug)
    .maybeSingle()

  if (trainerError) {
    // Log or ignore: we will still try to insert with trainerId = null
    console.error('Error fetching trainer:', trainerError)
  }

  const trainerId = trainerRow?.id ?? null

  const payload: StoredPlanJson = {
    ...params.storedPlan,
    trainerId
  }

  const { data, error } = await supabase
    .from('plans')
    .insert({
      user_id: null, // auth not implemented yet
      trainer_id: trainerId,
      title: params.title,
      plan_json: payload,
      nutrition_json: params.nutritionJson ?? null,
      technique_json: params.techniqueJson ?? null
    })
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Error inserting plan:', error)
    return { ok: false as const, planId: null }
  }

  return { ok: true as const, planId: data?.id ?? null }
}

