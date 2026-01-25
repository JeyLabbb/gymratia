import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const workoutId = searchParams.get('workoutId')
    const exerciseName = searchParams.get('exerciseName')
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabaseAdmin
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)

    if (workoutId) {
      query = query.eq('workout_id', workoutId)
    }

    if (exerciseName) {
      query = query.eq('exercise_name', exerciseName)
    }

    if (date) {
      query = query.eq('date', date)
    }

    if (startDate) {
      query = query.gte('date', startDate)
    }

    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data: logs, error } = await query.order('date', { ascending: false }).order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch exercise logs' }, { status: 500 })
    }

    return NextResponse.json({ logs: logs || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      workout_id,
      exercise_name,
      date,
      sets,
      notes
    } = body

    if (!workout_id || !exercise_name || !date || !sets) {
      return NextResponse.json({ error: 'workout_id, exercise_name, date, and sets are required' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if log already exists for this exercise and date
    const { data: existingLog } = await supabaseAdmin
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('workout_id', workout_id)
      .eq('exercise_name', exercise_name)
      .eq('date', date)
      .maybeSingle()

    if (existingLog) {
      // Update existing log
      const updatedSets = [...(existingLog.sets || []), ...sets]
      
      const { data: log, error } = await supabaseAdmin
        .from('exercise_logs')
        .update({
          sets: updatedSets,
          notes: notes || existingLog.notes
        })
        .eq('id', existingLog.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: `Failed to update exercise log: ${error.message}` }, { status: 500 })
      }

      return NextResponse.json({ log })
    }

    // Create new log
    const log: any = {
      user_id: user.id,
      workout_id,
      exercise_name,
      date,
      sets,
    }

    if (notes) log.notes = notes

    const { data: logRecord, error } = await supabaseAdmin
      .from('exercise_logs')
      .insert(log)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Failed to create exercise log: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ log: logRecord })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 })
    }

    const body = await req.json()
    const { sets, notes } = body

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates: any = {}
    if (sets !== undefined) updates.sets = sets
    if (notes !== undefined) updates.notes = notes

    const { data: log, error } = await supabaseAdmin
      .from('exercise_logs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Failed to update exercise log: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ log })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabaseAdmin
      .from('exercise_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: `Failed to delete exercise log: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}





