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
      .from('user_diets')
      .select('*')
      .eq('user_id', user.id)

    if (trainerSlug) {
      query = query.eq('trainer_slug', trainerSlug)
    }

    if (isActive === 'true') {
      query = query.eq('is_active', true)
    }

    const { data: diets, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching diets:', error)
      return NextResponse.json({ error: 'Failed to fetch diets' }, { status: 500 })
    }

    console.log('📋 API /diet GET - Returning diets:', {
      count: diets?.length || 0,
      isActive: isActive,
      diets: diets?.map((d: any) => ({
        id: d.id,
        title: d.title,
        is_active: d.is_active,
        trainer_slug: d.trainer_slug,
        has_diet_data: !!d.diet_data
      }))
    })

    return NextResponse.json({ diets: diets || [] })
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
      daily_calories,
      daily_protein_g,
      daily_carbs_g,
      daily_fats_g,
      diet_data 
    } = body

    if (!trainer_slug) {
      return NextResponse.json({ error: 'trainer_slug is required' }, { status: 400 })
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

    // Deactivate other active diets for this trainer
    if (body.is_active !== false) {
      await supabaseAdmin
        .from('user_diets')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('trainer_slug', trainer_slug)
        .eq('is_active', true)
    }

    const dietRecord: any = {
      user_id: user.id,
      trainer_slug,
      title: title || 'Dieta Personalizada',
      is_active: body.is_active !== false,
    }

    if (description) dietRecord.description = description
    if (start_date) dietRecord.start_date = start_date
    if (end_date) dietRecord.end_date = end_date
    if (daily_calories) dietRecord.daily_calories = daily_calories
    if (daily_protein_g) dietRecord.daily_protein_g = daily_protein_g
    if (daily_carbs_g) dietRecord.daily_carbs_g = daily_carbs_g
    if (daily_fats_g) dietRecord.daily_fats_g = daily_fats_g
    if (diet_data) dietRecord.diet_data = diet_data

    const { data: diet, error } = await supabaseAdmin
      .from('user_diets')
      .insert(dietRecord)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Failed to create diet: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ diet })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Diet ID is required' }, { status: 400 })
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

    const { data: diet, error } = await supabaseAdmin
      .from('user_diets')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Failed to update diet: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ diet })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

