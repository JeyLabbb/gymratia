import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      trainerId,
      trainerSlug,
      title,
      description,
      workout_data,
      target_goals,
      intensity_level,
      experience_level
    } = body

    if (!trainerId || !trainerSlug || !title || !workout_data) {
      return NextResponse.json(
        { error: 'trainerId, trainerSlug, title y workout_data son requeridos' },
        { status: 400 }
      )
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar que el trainer pertenece al usuario
    const { data: trainer } = await supabaseAdmin
      .from('trainers')
      .select('id, user_id')
      .eq('id', trainerId)
      .single()

    if (!trainer || trainer.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Crear workout
    const { data: workout, error } = await supabaseAdmin
      .from('trainer_workouts')
      .insert({
        trainer_id: trainerId,
        trainer_slug: trainerSlug,
        title,
        description: description || null,
        workout_data,
        target_goals: target_goals || [],
        intensity_level: intensity_level || null,
        experience_level: experience_level || null,
        tags: [],
        is_template: true,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creando workout:', error)
      return NextResponse.json(
        { error: `Error al crear el entrenamiento: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ workout })
  } catch (error: any) {
    console.error('Error en POST /api/trainer/workout:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

