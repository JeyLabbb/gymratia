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
    const minRating = searchParams.get('minRating')
    const minStudents = searchParams.get('minStudents')
    const privacy = searchParams.get('privacy')?.trim() || '' // '' | 'public' | 'private'
    const sortBy = searchParams.get('sortBy') || 'created_at' // created_at | average_rating | active_students | trainer_name
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    const validSort: Record<string, 'created_at' | 'average_rating' | 'active_students' | 'trainer_name'> = {
      created_at: 'created_at',
      average_rating: 'average_rating',
      active_students: 'active_students',
      trainer_name: 'trainer_name',
    }
    const orderBy = validSort[sortBy] ?? 'created_at'

    let query = supabase
      .from('trainers')
      .select('id, user_id, slug, trainer_name, full_name, email, privacy_mode, verification_status, total_students, active_students, average_rating, total_ratings, created_at')

    if (q) {
      query = query.or(`slug.ilike.%${q}%,trainer_name.ilike.%${q}%,email.ilike.%${q}%`)
    }
    if (privacy === 'public' || privacy === 'private') {
      query = query.eq('privacy_mode', privacy)
    }
    if (minRating !== null && minRating !== '') {
      const n = parseFloat(minRating)
      if (!Number.isNaN(n)) query = query.gte('average_rating', n)
    }
    if (minStudents !== null && minStudents !== '') {
      const n = parseInt(minStudents, 10)
      if (!Number.isNaN(n)) query = query.gte('active_students', n)
    }

    query = query.order(orderBy, { ascending: sortOrder === 'asc', nullsFirst: false })

    const { data: trainers, error } = await query

    if (error) throw error

    return NextResponse.json({ trainers: trainers || [] })
  } catch (error) {
    console.error('Portal trainers error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
