import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const trainerSlug = searchParams.get('trainerSlug')

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
      .from('meal_planners')
      .select('*')
      .eq('user_id', user.id)

    if (date) {
      query = query.eq('date', date)
    } else if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    }

    if (trainerSlug) {
      query = query.eq('trainer_slug', trainerSlug)
    }

    const { data: planners, error } = await query.order('date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch meal planners' }, { status: 500 })
    }

    return NextResponse.json({ planners: planners || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      trainer_slug, 
      diet_id,
      date, 
      meals,
      total_calories,
      total_protein_g,
      total_carbs_g,
      total_fats_g,
      notes
    } = body

    if (!trainer_slug || !date || !meals) {
      return NextResponse.json({ error: 'trainer_slug, date, and meals are required' }, { status: 400 })
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

    const plannerRecord: any = {
      user_id: user.id,
      trainer_slug,
      date,
      meals,
    }

    if (diet_id) plannerRecord.diet_id = diet_id
    if (total_calories) plannerRecord.total_calories = total_calories
    if (total_protein_g) plannerRecord.total_protein_g = total_protein_g
    if (total_carbs_g) plannerRecord.total_carbs_g = total_carbs_g
    if (total_fats_g) plannerRecord.total_fats_g = total_fats_g
    if (notes) plannerRecord.notes = notes

    const { data: planner, error } = await supabaseAdmin
      .from('meal_planners')
      .upsert(plannerRecord, { onConflict: 'user_id,date' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Failed to create meal planner: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ planner })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, date, ...updates } = body

    if (!id && !date) {
      return NextResponse.json({ error: 'ID or date is required' }, { status: 400 })
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

    let query = supabaseAdmin
      .from('meal_planners')
      .update(updates)
      .eq('user_id', user.id)

    if (id) {
      query = query.eq('id', id)
    } else if (date) {
      query = query.eq('date', date)
    }

    const { data: planner, error } = await query.select().single()

    if (error) {
      return NextResponse.json({ error: `Failed to update meal planner: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ planner })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}





