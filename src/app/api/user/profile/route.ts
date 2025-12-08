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
    const { height_cm, weight_kg, goal, sex, full_name, preferred_name, avatar_url } = body

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
      profileData.height_cm = Number(height_cm)
    }
    if (weight_kg !== undefined && weight_kg !== null && weight_kg !== '') {
      profileData.weight_kg = Number(weight_kg)
    }
    if (goal) profileData.goal = goal
    if (sex) profileData.sex = sex
    if (full_name) profileData.full_name = full_name
    if (preferred_name) profileData.preferred_name = preferred_name
    if (avatar_url) profileData.avatar_url = avatar_url
    if (user.email) profileData.email = user.email

    let updatedProfile
    if (existingProfile) {
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

