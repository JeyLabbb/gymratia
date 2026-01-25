import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

    const { searchParams } = new URL(req.url)
    const trainerSlug = searchParams.get('trainerSlug')

    let query = supabaseAdmin
      .from('trainer_notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })

    if (trainerSlug) {
      query = query.eq('trainer_slug', trainerSlug)
    }

    const { data: notifications, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    return NextResponse.json({ notifications: notifications || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { notificationId, trainer_slug, message, type, metadata } = body

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // If notificationId is provided, mark as read
    if (notificationId) {
      const { error } = await supabaseAdmin
        .from('trainer_notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) {
        return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // Otherwise, create new notification
    if (!trainer_slug || !message) {
      return NextResponse.json({ error: 'trainer_slug and message are required' }, { status: 400 })
    }

    const notification: any = {
      user_id: user.id,
      trainer_slug,
      message,
      read: false,
    }

    if (type) notification.type = type
    if (metadata) notification.metadata = metadata

    const { data: notificationRecord, error } = await supabaseAdmin
      .from('trainer_notifications')
      .insert(notification)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Failed to create notification: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ notification: notificationRecord })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}


