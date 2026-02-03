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

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const iso7d = sevenDaysAgo.toISOString()

    const [
      { count: totalUsers },
      { count: totalTrainers },
      { data: trainers },
      { count: totalChats },
      { count: chatsLast7d },
      { count: activeWorkouts },
      { count: activeDiets },
      { count: pendingRequests },
    ] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('trainers').select('*', { count: 'exact', head: true }),
      supabase.from('trainers').select('id, privacy_mode, verification_status'),
      supabase.from('trainer_chats').select('*', { count: 'exact', head: true }),
      supabase.from('trainer_chats').select('*', { count: 'exact', head: true }).gte('created_at', iso7d),
      supabase.from('user_workouts').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('user_diets').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('trainer_access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ])

    const trainersList = trainers || []
    const publicCount = trainersList.filter((t: any) => t.privacy_mode === 'public').length
    const privateCount = trainersList.filter((t: any) => t.privacy_mode === 'private').length

    return NextResponse.json({
      totalUsers: totalUsers ?? 0,
      totalTrainers: totalTrainers ?? 0,
      trainersPublic: publicCount,
      trainersPrivate: privateCount,
      totalChats: totalChats ?? 0,
      chatsLast7d: chatsLast7d ?? 0,
      activeWorkouts: activeWorkouts ?? 0,
      activeDiets: activeDiets ?? 0,
      pendingRequests: pendingRequests ?? 0,
    })
  } catch (error) {
    console.error('Portal overview error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
