import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { height_cm, weight_kg, target_weight_kg, goal, sex, full_name, preferred_name, avatar_url, preferred_meal_times, training_schedule, terms_accepted_at, terms_version } = body

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify user with service role client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: `Unauthorized: ${authError.message}` }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User not found' }, { status: 401 })
    }

    // Check if profile exists
    const { data: existingProfile, error: selectError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing profile:', selectError)
      return NextResponse.json({ error: `Database error: ${selectError.message}` }, { status: 500 })
    }

    const profileData: any = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    if (height_cm !== undefined && height_cm !== null && height_cm !== '') {
      let heightValue = Number(height_cm)
      // If height is less than 100, assume it's in meters and convert to cm
      if (heightValue > 0 && heightValue < 100) {
        heightValue = heightValue * 100
      }
      // Ensure it's an integer for INTEGER column type
      profileData.height_cm = Math.round(heightValue)
    }
    if (weight_kg !== undefined && weight_kg !== null && weight_kg !== '') {
      profileData.weight_kg = Number(weight_kg)
    }
    if (goal) profileData.goal = goal
    if (target_weight_kg !== undefined && target_weight_kg !== null && target_weight_kg !== '') {
      profileData.target_weight_kg = Number(target_weight_kg)
    } else if (target_weight_kg === '' || target_weight_kg === null) {
      profileData.target_weight_kg = null
    }
    if (sex) profileData.sex = sex
    if (full_name) profileData.full_name = full_name
    if (preferred_name) profileData.preferred_name = preferred_name
    if (avatar_url) profileData.avatar_url = avatar_url
    if (preferred_meal_times) profileData.preferred_meal_times = preferred_meal_times
    if (training_schedule) profileData.training_schedule = training_schedule
    if (terms_accepted_at) profileData.terms_accepted_at = terms_accepted_at
    if (terms_version) profileData.terms_version = terms_version
    if (user.email) profileData.email = user.email

    let updatedProfile
    if (existingProfile) {
      // Check if weight is being updated
      const isWeightUpdate = weight_kg !== undefined && weight_kg !== null && weight_kg !== ''
      const oldWeight = existingProfile.weight_kg
      const newWeight = isWeightUpdate ? Number(weight_kg) : null

      // Update existing profile (trigger will handle notifications)
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        return NextResponse.json({ 
          error: `Failed to update profile: ${error.message}`,
          details: error 
        }, { status: 500 })
      }
      updatedProfile = data

      // Si se actualizó full_name, sincronizar con el perfil de entrenador si existe
      if (full_name && updatedProfile.full_name) {
        const { data: trainerProfile } = await supabaseAdmin
          .from('trainers')
          .select('id, full_name')
          .eq('user_id', user.id)
          .maybeSingle()

        if (trainerProfile && trainerProfile.full_name !== updatedProfile.full_name) {
          await supabaseAdmin
            .from('trainers')
            .update({ 
              full_name: updatedProfile.full_name,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
        }
      }

      // If weight was updated and it changed, create or update progress record for today
      if (isWeightUpdate && newWeight !== null && newWeight !== oldWeight) {
        const today = new Date().toISOString().split('T')[0]
        try {
          // Check if a progress record already exists for today
          const { data: existingProgress, error: checkError } = await supabaseAdmin
            .from('progress_tracking')
            .select('id')
            .eq('user_id', user.id)
            .eq('date', today)
            .maybeSingle()

          if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing progress record:', checkError)
          } else if (existingProgress) {
            // Update existing record
            const { error: updateError } = await supabaseAdmin
              .from('progress_tracking')
              .update({
                weight_kg: newWeight,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingProgress.id)

            if (updateError) {
              console.error('Error updating progress record:', updateError)
            } else {
              console.log('✅ Progress record updated for user:', user.id, 'with weight:', newWeight)
            }
          } else {
            // Create new record
            const { error: insertError } = await supabaseAdmin
              .from('progress_tracking')
              .insert({
                user_id: user.id,
                date: today,
                weight_kg: newWeight,
              })

            if (insertError) {
              console.error('Error creating progress record:', insertError)
            } else {
              console.log('✅ Progress record created for user:', user.id, 'with weight:', newWeight)
            }
          }
        } catch (e) {
          console.error('Error handling progress record:', e)
          // Don't fail the request if progress record creation fails
        }
      }
    } else {
      // Create new profile
      profileData.created_at = new Date().toISOString()
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        return NextResponse.json({ 
          error: `Failed to create profile: ${error.message}`,
          details: error 
        }, { status: 500 })
      }
      updatedProfile = data

      // If weight was provided, create initial progress record for today
      if (weight_kg !== undefined && weight_kg !== null && weight_kg !== '') {
        const today = new Date().toISOString().split('T')[0]
        try {
          const { error: progressError } = await supabaseAdmin
            .from('progress_tracking')
            .insert({
              user_id: user.id,
              date: today,
              weight_kg: Number(weight_kg),
            })

          if (progressError) {
            console.error('Error creating initial progress record:', progressError)
            // Don't fail the request if progress record creation fails
          } else {
            console.log('✅ Initial progress record created for user:', user.id, 'with weight:', weight_kg)
          }
        } catch (e) {
          console.error('Error creating initial progress record:', e)
          // Don't fail the request if progress record creation fails
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      profile: updatedProfile,
      message: 'Perfil actualizado. Tu entrenador ha sido notificado de los cambios.'
    })
  } catch (error: any) {
    console.error('Profile error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      stack: error.stack 
    }, { status: 500 })
  }
}

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

    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    return NextResponse.json({ profile: profile || null })
  } catch (error: any) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

