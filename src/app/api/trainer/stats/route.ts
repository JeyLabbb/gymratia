import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** GET /api/trainer/stats - Devuelve estadísticas reales del entrenador desde la BD */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: trainer } = await supabaseAdmin
      .from('trainers')
      .select('id, slug, active_students')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!trainer) {
      return NextResponse.json({ activeStudents: 0, totalWorkouts: 0, totalDiets: 0 })
    }

    // Contar alumnos reales desde trainer_chats (fuente de verdad)
    const { count: chatsCount } = await supabaseAdmin
      .from('trainer_chats')
      .select('*', { count: 'exact', head: true })
      .eq('trainer_slug', trainer.slug)

    // Usuarios únicos: necesitamos distinct user_id
    const { data: chatsData } = await supabaseAdmin
      .from('trainer_chats')
      .select('user_id')
      .eq('trainer_slug', trainer.slug)

    const uniqueUserIds = new Set((chatsData || []).map((c: any) => c.user_id))
    const activeStudents = uniqueUserIds.size

    const [workoutsRes, dietsRes] = await Promise.all([
      supabaseAdmin.from('trainer_workouts').select('id', { count: 'exact', head: true }).eq('trainer_id', trainer.id),
      supabaseAdmin.from('trainer_diets').select('id', { count: 'exact', head: true }).eq('trainer_id', trainer.id)
    ])

    return NextResponse.json({
      activeStudents,
      totalWorkouts: workoutsRes.count ?? 0,
      totalDiets: dietsRes.count ?? 0
    })
  } catch (error: any) {
    console.error('Error fetching trainer stats:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
