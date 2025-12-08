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

    const { data: progress, error } = await supabaseAdmin
      .from('progress_tracking')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
    }

    return NextResponse.json({ progress: progress || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { date, weight_kg, body_fat_percentage, measurements, notes } = body

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const progressData: any = {
      user_id: user.id,
      date: date || new Date().toISOString().split('T')[0],
    }

    if (weight_kg !== undefined && weight_kg !== null) {
      progressData.weight_kg = Number(weight_kg)
    }
    if (body_fat_percentage !== undefined && body_fat_percentage !== null) {
      progressData.body_fat_percentage = Number(body_fat_percentage)
    }
    if (measurements) {
      progressData.measurements = measurements
    }
    if (notes) {
      progressData.notes = notes
    }

    const { data: progress, error } = await supabaseAdmin
      .from('progress_tracking')
      .insert(progressData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Failed to save progress: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ progress })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}


