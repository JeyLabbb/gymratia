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
    const category = searchParams.get('category')

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
      .from('user_food_categories')
      .select('*')
      .eq('user_id', user.id)

    if (trainerSlug) {
      query = query.eq('trainer_slug', trainerSlug)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data: categories, error } = await query.order('food_name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch food categories' }, { status: 500 })
    }

    return NextResponse.json({ categories: categories || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      trainer_slug,
      food_name,
      category,
      quantity_per_serving,
      calories_per_100g,
      protein_per_100g,
      carbs_per_100g,
      fats_per_100g,
      notes
    } = body

    if (!trainer_slug || !food_name || !category) {
      return NextResponse.json({ error: 'trainer_slug, food_name, and category are required' }, { status: 400 })
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

    const foodCategory: any = {
      user_id: user.id,
      trainer_slug,
      food_name,
      category,
    }

    if (quantity_per_serving) foodCategory.quantity_per_serving = quantity_per_serving
    if (calories_per_100g) foodCategory.calories_per_100g = calories_per_100g
    if (protein_per_100g) foodCategory.protein_per_100g = protein_per_100g
    if (carbs_per_100g) foodCategory.carbs_per_100g = carbs_per_100g
    if (fats_per_100g) foodCategory.fats_per_100g = fats_per_100g
    if (notes) foodCategory.notes = notes

    const { data: categoryRecord, error } = await supabaseAdmin
      .from('user_food_categories')
      .insert(foodCategory)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Failed to create food category: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ category: categoryRecord })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
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

    const { data: category, error } = await supabaseAdmin
      .from('user_food_categories')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Failed to update food category: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ category })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
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
      .from('user_food_categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: `Failed to delete food category: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}





