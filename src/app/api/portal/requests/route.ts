import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPortalSession } from '@/lib/portal-session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const session = await getPortalSession()
    if (!session.email || !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: requestsData, error } = await supabase
      .from('trainer_access_requests')
      .select('id, user_id, trainer_id, message, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error

    const trainerIds = [...new Set((requestsData || []).map((r: any) => r.trainer_id))]
    const { data: trainersData } = trainerIds.length > 0
      ? await supabase.from('trainers').select('id, slug, trainer_name, email').in('id', trainerIds)
      : { data: [] }

    const trainersById = (trainersData || []).reduce((acc: Record<string, any>, t: any) => {
      acc[t.id] = t
      return acc
    }, {})

    const requests = (requestsData || []).map((r: any) => ({
      ...r,
      trainer: trainersById[r.trainer_id],
    }))

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Portal requests error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
