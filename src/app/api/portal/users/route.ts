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
    const withTrainer = searchParams.get('withTrainer')

    let query = supabase
      .from('user_profiles')
      .select('id, user_id, full_name, preferred_name, email, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (q) {
      query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,preferred_name.ilike.%${q}%`)
    }

    const { data: profiles, error } = await query

    if (error) throw error

    const userIds = (profiles || []).map((p: any) => p.user_id)

    const { data: chats } = await supabase
      .from('trainer_chats')
      .select('user_id, trainer_slug')
      .in('user_id', userIds)

    const chatByUser = (chats || []).reduce((acc: Record<string, string[]>, c: any) => {
      if (!acc[c.user_id]) acc[c.user_id] = []
      acc[c.user_id].push(c.trainer_slug)
      return acc
    }, {})

    let result = (profiles || []).map((p: any) => ({
      ...p,
      trainer_slugs: chatByUser[p.user_id] || [],
      hasTrainer: (chatByUser[p.user_id] || []).length > 0,
    }))

    if (withTrainer === 'true') {
      result = result.filter((r: any) => r.hasTrainer)
    } else if (withTrainer === 'false') {
      result = result.filter((r: any) => !r.hasTrainer)
    }

    return NextResponse.json({ users: result })
  } catch (error) {
    console.error('Portal users error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
