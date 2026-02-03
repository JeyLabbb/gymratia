import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Permite al entrenador escribir logs de entrenamiento en nombre del alumno.
 * Solo si el alumno pertenece a ese entrenador (chat existente o relación aprobada).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { student_id, workout_id, exercise_name, date, sets } = body

    if (!student_id || !workout_id || !exercise_name || !date || !sets) {
      return NextResponse.json(
        { error: 'student_id, workout_id, exercise_name, date and sets are required' },
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

    // Verificar que el caller es entrenador
    const { data: trainer } = await supabaseAdmin
      .from('trainers')
      .select('id, slug')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!trainer) {
      return NextResponse.json({ error: 'Solo los entrenadores pueden usar esta función' }, { status: 403 })
    }

    // Verificar que el alumno tiene acceso a este entrenador (chat, relación o solicitud aprobada)
    const [chatRes, relRes, reqRes] = await Promise.all([
      supabaseAdmin.from('trainer_chats').select('id').eq('user_id', student_id).eq('trainer_slug', trainer.slug).maybeSingle(),
      supabaseAdmin.from('trainer_student_relationships').select('id').eq('trainer_id', trainer.id).eq('student_id', student_id).eq('status', 'active').maybeSingle(),
      supabaseAdmin.from('trainer_access_requests').select('id').eq('user_id', student_id).eq('trainer_id', trainer.id).eq('status', 'approved').maybeSingle(),
    ])
    const hasAccess = !!(chatRes.data || relRes.data || reqRes.data)
    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes permiso para escribir logs de este alumno' }, { status: 403 })
    }

    // Buscar log existente
    const { data: existingLog } = await supabaseAdmin
      .from('exercise_logs')
      .select('*')
      .eq('user_id', student_id)
      .eq('workout_id', workout_id)
      .eq('exercise_name', exercise_name)
      .eq('date', date)
      .maybeSingle()

    const setsArray = Array.isArray(sets) ? sets : [sets]

    if (existingLog) {
      const existing = (existingLog.sets || []) as Array<{ set_number: number; [k: string]: any }>
      const merged = [...existing]
      for (const incoming of setsArray as Array<{ set_number: number; reps?: number; weight_kg?: number }>) {
        const idx = merged.findIndex((s) => s.set_number === incoming.set_number)
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...incoming }
        } else {
          merged.push(incoming as any)
        }
      }

      const { data: updated, error } = await supabaseAdmin
        .from('exercise_logs')
        .update({
          sets: merged,
          updated_at: new Date().toISOString(),
          updated_by_role: 'coach',
          updated_by_user_id: user.id
        })
        .eq('id', existingLog.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ log: updated })
    }

    const { data: newLog, error } = await supabaseAdmin
      .from('exercise_logs')
      .insert({
        user_id: student_id,
        workout_id,
        exercise_name,
        date,
        sets: setsArray,
        updated_by_role: 'coach',
        updated_by_user_id: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ log: newLog })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
