import { NextResponse } from 'next/server'

import { personas } from '@/lib/personas'
import { chatJSON } from '@/lib/openai'
import { Plan, type PlanType } from '@/lib/schemas'
import { insertPlanRecord, type StoredPlanJson } from '@/lib/plan-storage'

function mockPlan(): PlanType {
  return {
    title: 'Plan demo 9 semanas',
    weeks: Array.from({ length: 9 }, (_, w) => ({
      week: w + 1,
      days: [
        { day: 'Lunes (Push)', work: [
          { exercise:'Press banca', sets:4, reps:'6-8', intensity:'RIR 1-2' },
          { exercise:'Press militar', sets:3, reps:'8-10' },
          { exercise:'Fondos', sets:3, reps:'AMRAP' },
          { exercise:'Aperturas', sets:3, reps:'12-15' }
        ]},
        { day: 'Miércoles (Pull)', work: [
          { exercise:'Peso muerto rumano', sets:3, reps:'6-8' },
          { exercise:'Remo con barra', sets:4, reps:'8-10' },
          { exercise:'Dominadas', sets:3, reps:'AMRAP' },
          { exercise:'Curl bíceps', sets:3, reps:'10-12' }
        ]},
        { day: 'Viernes (Pierna)', work: [
          { exercise:'Sentadilla', sets:4, reps:'5-6' },
          { exercise:'Prensa', sets:3, reps:'10-12' },
          { exercise:'Curl femoral', sets:3, reps:'10-12' },
          { exercise:'Gemelos', sets:3, reps:'12-15' }
        ]}
      ]
    }))
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { mode = 'basic', values = {}, trainerSlug = 'edu', title = 'Plan 9 semanas' } = body
    const coach = personas.find((p) => p.slug === trainerSlug) ?? personas[0]

    let raw: unknown
    if (process.env.USE_MOCK === '1') {
      raw = mockPlan()
    } else {
      const system = `${coach.persona.system}
Responde SOLO JSON con shape:
{ "title": string, "weeks": [ { "week": number, "days": [ { "day": string, "work": [ { "exercise": string, "sets": number, "reps": string, "intensity"?: string } ] } ] } ] }
Reglas:
- 9 semanas exactas; 4-6 ejercicios/día.
- Días como "Lunes (Push)", "Miércoles (Pull)", etc.
- Volumen e intensidad realistas para ${coach.name} (mode: ${mode}).`

      // Build userContext from storedPlan (we'll build it before storedPlan, but reference it)
      const trainerSlugFromRequest = trainerSlug ?? 'edu'
      const extraContext = typeof values?.extraContext === 'string' ? values.extraContext : undefined

      const userContext = {
        profile: {
          fullName: typeof values?.fullName === 'string' ? values.fullName : undefined,
          sex: typeof values?.sex === 'string' ? values.sex : undefined,
          height_cm: typeof values?.heightCm === 'number' ? values.heightCm : undefined,
          weight_kg: typeof values?.weightKg === 'number' ? values.weightKg : undefined,
          goal: typeof values?.goal === 'string' ? values.goal : undefined,
          notes: extraContext || undefined
        },
        availability: {
          daysPerWeek: typeof values?.daysPerWeek === 'number' ? values.daysPerWeek : undefined,
          cannotTrain: Array.isArray(values?.cannotTrainDays)
            ? values.cannotTrainDays
            : typeof values?.cannotTrainDays === 'string'
              ? values.cannotTrainDays.split(',').map((d: string) => d.trim()).filter(Boolean)
              : undefined
        },
        intensity: typeof values?.intensity === 'number' ? values.intensity : undefined
      }

      const user = `Genera plan 9 semanas. Filosofía del entrenador: ${coach.philosophy}. Solo JSON.`
      raw = await chatJSON(system, user, userContext)
    }

    const parsed = Plan.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.format() }, { status: 400 })
    const plan: PlanType = parsed.data

    // Rebuild userContext to ensure storedPlan matches what was sent to AI
    const trainerSlugFromRequest = trainerSlug ?? 'edu'
    const extraContext = typeof values?.extraContext === 'string' ? values.extraContext : undefined

    const storedPlan: StoredPlanJson = {
      version: 'v1',
      source: 'json',
      trainerSlug: trainerSlugFromRequest,
      trainerId: null, // filled by helper
      // These profile/availability fields are optional and can be best-effort:
      profile: {
        fullName: typeof values?.fullName === 'string' ? values.fullName : undefined,
        sex: typeof values?.sex === 'string' ? values.sex : undefined,
        height_cm: typeof values?.heightCm === 'number' ? values.heightCm : undefined,
        weight_kg: typeof values?.weightKg === 'number' ? values.weightKg : undefined,
        goal: typeof values?.goal === 'string' ? values.goal : undefined,
        notes: extraContext || undefined
      },
      availability: {
        daysPerWeek: typeof values?.daysPerWeek === 'number' ? values.daysPerWeek : undefined,
        cannotTrain: Array.isArray(values?.cannotTrainDays)
          ? values.cannotTrainDays
          : typeof values?.cannotTrainDays === 'string'
            ? values.cannotTrainDays.split(',').map((d: string) => d.trim()).filter(Boolean)
            : undefined
      },
      intensity: typeof values?.intensity === 'number' ? values.intensity : undefined,
      structuredPlan: plan // full AI/mock structured plan
    }

    const insertResult = await insertPlanRecord({
      title: plan.title || title,
      trainerSlug: trainerSlugFromRequest,
      storedPlan,
      nutritionJson: { tips: coach.persona.nutrition },
      techniqueJson: { notes: 'Prioriza técnica, calentamiento y progresión segura.' }
    })

    if (!insertResult.ok) {
      console.error('Error inserting plan, but returning success response anyway')
    }

    return NextResponse.json({
      ok: true,
      planId: insertResult.planId ?? null
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? JSON.stringify(e) ?? 'unknown' }, { status: 500 })
  }
}
