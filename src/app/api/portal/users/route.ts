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

    // Fetch ALL users from auth (OAuth + email)
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const authUsers = authData?.users || []

    // Fetch profiles and chats
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, user_id, full_name, preferred_name, email, created_at, updated_at, height_cm, goal')

    const profileByUserId = (profiles || []).reduce((acc: Record<string, any>, p: any) => {
      acc[p.user_id] = p
      return acc
    }, {})

    const { data: chats } = await supabase
      .from('trainer_chats')
      .select('user_id, trainer_slug')

    const chatByUser = (chats || []).reduce((acc: Record<string, string[]>, c: any) => {
      if (!acc[c.user_id]) acc[c.user_id] = []
      acc[c.user_id].push(c.trainer_slug)
      return acc
    }, {})

    let result = authUsers.map((u: any) => {
      const profile = profileByUserId[u.id]
      const trainerSlugs = chatByUser[u.id] || []
      return {
        id: profile?.id ?? u.id,
        user_id: u.id,
        email: profile?.email ?? u.email ?? null,
        full_name: profile?.full_name ?? u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
        preferred_name: profile?.preferred_name ?? null,
        created_at: profile?.created_at ?? u.created_at,
        updated_at: profile?.updated_at ?? u.updated_at,
        trainer_slugs: trainerSlugs,
        hasTrainer: trainerSlugs.length > 0,
        hasProfile: !!profile,
        onboardingComplete: !!(profile?.height_cm != null && profile?.goal),
      }
    })

    if (q) {
      const lower = q.toLowerCase()
      result = result.filter((r: any) =>
        (r.email || '').toLowerCase().includes(lower) ||
        (r.full_name || '').toLowerCase().includes(lower) ||
        (r.preferred_name || '').toLowerCase().includes(lower)
      )
    }

    if (withTrainer === 'true') {
      result = result.filter((r: any) => r.hasTrainer)
    } else if (withTrainer === 'false') {
      result = result.filter((r: any) => !r.hasTrainer)
    }

    result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ users: result })
  } catch (error) {
    console.error('Portal users error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
