import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// POST /api/social/follow?userId=xxx&action=follow - Seguir/Dejar de seguir
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const action = searchParams.get('action') || 'follow' // 'follow' | 'unfollow'

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      )
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'No puedes seguirte a ti mismo' },
        { status: 400 }
      )
    }

    if (action === 'follow') {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: session.user.id,
          following_id: userId
        })

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ success: true, following: true })
        }
        console.error('Error following user:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, following: true })
    } else if (action === 'unfollow') {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', session.user.id)
        .eq('following_id', userId)

      if (error) {
        console.error('Error unfollowing user:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, following: false })
    } else {
      return NextResponse.json(
        { error: 'Acción no válida' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error in POST /api/social/follow:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/social/follow?userId=xxx - Verificar si sigues a un usuario
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ following: false })
    }

    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', session.user.id)
      .eq('following_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error checking follow status:', error)
      return NextResponse.json({ following: false })
    }

    return NextResponse.json({ following: !!data })
  } catch (error: any) {
    console.error('Error in GET /api/social/follow:', error)
    return NextResponse.json({ following: false })
  }
}

