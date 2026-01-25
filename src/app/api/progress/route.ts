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

    const progressDate = date || new Date().toISOString().split('T')[0]

    // Check if a record already exists for this date
    const { data: existingRecord, error: checkError } = await supabaseAdmin
      .from('progress_tracking')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', progressDate)
      .maybeSingle()

    const progressData: any = {
      user_id: user.id,
      date: progressDate,
      updated_at: new Date().toISOString(),
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

    let progress
    let error

    if (existingRecord) {
      // Update existing record
      const { data: updatedProgress, error: updateError } = await supabaseAdmin
        .from('progress_tracking')
        .update(progressData)
        .eq('id', existingRecord.id)
        .select()
        .single()

      progress = updatedProgress
      error = updateError
    } else {
      // Create new record
      const { data: newProgress, error: insertError } = await supabaseAdmin
        .from('progress_tracking')
        .insert(progressData)
        .select()
        .single()

      progress = newProgress
      error = insertError
    }

    if (error) {
      return NextResponse.json({ error: `Failed to save progress: ${error.message}` }, { status: 500 })
    }

    // If weight was saved, update user_profiles.weight_kg with the most recent weight
    // This triggers notifications and keeps the profile in sync
    if (weight_kg !== undefined && weight_kg !== null && progress) {
      // Get the most recent weight entry for this user
      const { data: latestWeightEntry } = await supabaseAdmin
        .from('progress_tracking')
        .select('weight_kg, date')
        .eq('user_id', user.id)
        .not('weight_kg', 'is', null)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      if (latestWeightEntry && latestWeightEntry.weight_kg) {
        // Update user_profiles.weight_kg with the most recent weight
        // This will trigger the notification system via database triggers
        await supabaseAdmin
          .from('user_profiles')
          .update({ 
            weight_kg: Number(latestWeightEntry.weight_kg),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
      }
    }

    return NextResponse.json({ progress })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, date, weight_kg, body_fat_percentage, measurements, notes } = body

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Verify the record belongs to the user
    const { data: existingRecord, error: checkError } = await supabaseAdmin
      .from('progress_tracking')
      .select('user_id')
      .eq('id', id)
      .single()

    if (checkError || !existingRecord || existingRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'Record not found or unauthorized' }, { status: 404 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (date !== undefined) {
      updateData.date = date
    }
    if (weight_kg !== undefined && weight_kg !== null) {
      updateData.weight_kg = Number(weight_kg)
    } else if (weight_kg === null) {
      updateData.weight_kg = null
    }
    if (body_fat_percentage !== undefined && body_fat_percentage !== null) {
      updateData.body_fat_percentage = Number(body_fat_percentage)
    } else if (body_fat_percentage === null) {
      updateData.body_fat_percentage = null
    }
    if (measurements !== undefined) {
      updateData.measurements = measurements
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }

    const { data: progress, error } = await supabaseAdmin
      .from('progress_tracking')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Failed to update progress: ${error.message}` }, { status: 500 })
    }

    // If weight was updated, update user_profiles.weight_kg with the most recent weight
    // This triggers notifications and keeps the profile in sync
    if (weight_kg !== undefined && progress) {
      // Get the most recent weight entry for this user
      const { data: latestWeightEntry } = await supabaseAdmin
        .from('progress_tracking')
        .select('weight_kg, date')
        .eq('user_id', user.id)
        .not('weight_kg', 'is', null)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      if (latestWeightEntry && latestWeightEntry.weight_kg) {
        // Update user_profiles.weight_kg with the most recent weight
        // This will trigger the notification system via database triggers
        await supabaseAdmin
          .from('user_profiles')
          .update({ 
            weight_kg: Number(latestWeightEntry.weight_kg),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
      }
    }

    return NextResponse.json({ progress })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
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

    // Verify the record belongs to the user
    const { data: existingRecord, error: checkError } = await supabaseAdmin
      .from('progress_tracking')
      .select('user_id')
      .eq('id', id)
      .single()

    if (checkError || !existingRecord || existingRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'Record not found or unauthorized' }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from('progress_tracking')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: `Failed to delete progress: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}


