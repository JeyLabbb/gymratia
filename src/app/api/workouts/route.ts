import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const trainerSlug = searchParams.get('trainerSlug')
    const isActive = searchParams.get('isActive')

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
      .from('user_workouts')
      .select('*')
      .eq('user_id', user.id)

    if (trainerSlug) {
      query = query.eq('trainer_slug', trainerSlug)
    }

    if (isActive !== null && isActive !== '') {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data: workouts, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 })
    }

    return NextResponse.json({ workouts: workouts || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      trainer_slug,
      title,
      description,
      start_date,
      end_date,
      workout_data,
      is_active
    } = body

    if (!trainer_slug || !title || !workout_data) {
      return NextResponse.json({ error: 'trainer_slug, title, and workout_data are required' }, { status: 400 })
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

    // If this is set as active, deactivate other workouts
    if (is_active) {
      await supabaseAdmin
        .from('user_workouts')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('trainer_slug', trainer_slug)
    }

    const workout: any = {
      user_id: user.id,
      trainer_slug,
      title,
      workout_data,
    }

    if (description) workout.description = description
    if (start_date) workout.start_date = start_date
    if (end_date) workout.end_date = end_date
    if (is_active !== undefined) workout.is_active = is_active

    const { data: workoutRecord, error } = await supabaseAdmin
      .from('user_workouts')
      .insert(workout)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Failed to create workout: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ workout: workoutRecord })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Workout ID is required' }, { status: 400 })
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

    // If setting as active, deactivate others
    if (updates.is_active) {
      const { data: currentWorkout } = await supabaseAdmin
        .from('user_workouts')
        .select('trainer_slug')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (currentWorkout) {
        await supabaseAdmin
          .from('user_workouts')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('trainer_slug', currentWorkout.trainer_slug)
          .neq('id', id)
      }
    }

    const { data: workout, error } = await supabaseAdmin
      .from('user_workouts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Failed to update workout: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ workout })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Workout ID is required' }, { status: 400 })
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
      .from('user_workouts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: `Failed to delete workout: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

