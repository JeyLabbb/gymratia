import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPortalSession } from '@/lib/portal-session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const session = await getPortalSession()
    if (!session.email || !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''

    let query = supabase
      .from('trainers')
      .select('id, user_id, slug, trainer_name, full_name, email, privacy_mode, verification_status, total_students, active_students, average_rating, total_ratings, created_at')
      .order('created_at', { ascending: false })

    if (q) {
      query = query.or(`slug.ilike.%${q}%,trainer_name.ilike.%${q}%,email.ilike.%${q}%`)
    }

    const { data: trainers, error } = await query

    if (error) throw error

    return NextResponse.json({ trainers: trainers || [] })
  } catch (error) {
    console.error('Portal trainers error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
