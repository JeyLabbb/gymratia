import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** GET /api/trainer/students - Lista alumnos con chat activo (datos reales desde BD) */
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
      .select('id, slug')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!trainer) {
      return NextResponse.json({ students: [] })
    }

    const { data: chats } = await supabaseAdmin
      .from('trainer_chats')
      .select('user_id')
      .eq('trainer_slug', trainer.slug)

    const userIds = [...new Set((chats || []).map((c: any) => c.user_id))]
    if (userIds.length === 0) {
      return NextResponse.json({ students: [] })
    }

    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds)

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]))

    const students = userIds.map((id) => {
      const p = profileMap.get(id)
      return {
        user_id: id,
        full_name: p?.full_name || null,
        email: p?.email || null,
      }
    })

    return NextResponse.json({ students })
  } catch (error: any) {
    console.error('Error fetching trainer students:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
