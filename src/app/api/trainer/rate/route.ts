import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { trainerSlug, rating } = body

    if (!trainerSlug || !rating) {
      return NextResponse.json({ error: 'trainerSlug y rating son requeridos' }, { status: 400 })
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: 'Rating debe ser un número entero entre 1 y 5' }, { status: 400 })
    }

    // Verificar que el entrenador existe
    const { data: trainer } = await supabaseAdmin
      .from('trainers')
      .select('slug')
      .eq('slug', trainerSlug)
      .maybeSingle()

    if (!trainer) {
      // Verificar si es un entrenador del sistema (personas.ts)
      const validSystemTrainers = ['edu', 'carolina', 'jey']
      if (!validSystemTrainers.includes(trainerSlug)) {
        return NextResponse.json({ error: 'Entrenador no encontrado' }, { status: 404 })
      }
    }

    // Insertar o actualizar valoración (UPSERT)
    const { data: existingRating } = await supabaseAdmin
      .from('trainer_ratings')
      .select('id, rating')
      .eq('user_id', user.id)
      .eq('trainer_slug', trainerSlug)
      .maybeSingle()

    if (existingRating) {
      // Actualizar valoración existente
      const { error: updateError } = await supabaseAdmin
        .from('trainer_ratings')
        .update({
          rating,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRating.id)

      if (updateError) {
        console.error('Error actualizando valoración:', updateError)
        return NextResponse.json({ error: 'Error al actualizar la valoración' }, { status: 500 })
      }
    } else {
      // Crear nueva valoración
      const { error: insertError } = await supabaseAdmin
        .from('trainer_ratings')
        .insert({
          user_id: user.id,
          trainer_slug: trainerSlug,
          rating
        })

      if (insertError) {
        console.error('Error insertando valoración:', insertError)
        return NextResponse.json({ error: 'Error al crear la valoración' }, { status: 500 })
      }
    }

    // Obtener estadísticas actualizadas
    const { data: stats } = await supabaseAdmin
      .from('trainer_ratings')
      .select('rating')
      .eq('trainer_slug', trainerSlug)

    const averageRating = stats && stats.length > 0
      ? stats.reduce((sum, r) => sum + r.rating, 0) / stats.length
      : 0

    return NextResponse.json({
      success: true,
      rating,
      averageRating: Number(averageRating.toFixed(2)),
      totalRatings: stats?.length || 0
    })
  } catch (error: any) {
    console.error('Error en rate trainer:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const trainerSlug = searchParams.get('trainerSlug')

    if (!trainerSlug) {
      return NextResponse.json({ error: 'trainerSlug es requerido' }, { status: 400 })
    }

    // Obtener valoración del usuario para este entrenador
    const { data: rating } = await supabaseAdmin
      .from('trainer_ratings')
      .select('rating')
      .eq('user_id', user.id)
      .eq('trainer_slug', trainerSlug)
      .maybeSingle()

    return NextResponse.json({
      hasRated: !!rating,
      userRating: rating?.rating || null
    })
  } catch (error: any) {
    console.error('Error obteniendo rating:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
