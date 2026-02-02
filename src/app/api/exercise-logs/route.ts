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
    const workoutIds = searchParams.get('workoutIds') // Comma-separated for merging related workouts
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

    if (workoutIds) {
      const ids = workoutIds.split(',').map((id: string) => id.trim()).filter(Boolean)
      if (ids.length > 0) {
        query = query.in('workout_id', ids)
      }
    } else if (workoutId) {
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

    const { data: logs, error } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(2000)

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
      notes,
      related_workout_ids
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

    // Check if log already exists for this exercise and date (same workout or any related)
    let existingLog: any = null
    const { data: exactMatch } = await supabaseAdmin
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('workout_id', workout_id)
      .eq('exercise_name', exercise_name)
      .eq('date', date)
      .maybeSingle()
    existingLog = exactMatch

    // If no exact match, check for same exercise+date under any related workout (avoid duplicates when merging)
    if (!existingLog && body.related_workout_ids?.length) {
      const { data: rows } = await supabaseAdmin
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .in('workout_id', [workout_id, ...body.related_workout_ids])
        .eq('exercise_name', exercise_name)
        .eq('date', date)
        .limit(1)
      existingLog = rows?.[0]
    }

    if (existingLog) {
      // Update existing log - merge by set_number
      const existing = (existingLog.sets || []) as Array<{ set_number: number; [k: string]: any }>
      const merged = [...existing]
      for (const incoming of sets as Array<{ set_number: number; [k: string]: any }>) {
        const idx = merged.findIndex(s => s.set_number === incoming.set_number)
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...incoming }
        } else {
          merged.push(incoming)
        }
      }
      const updatedSets = merged
      
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





