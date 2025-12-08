import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      fullName, 
      heightCm, 
      weightKg, 
      goal, 
      sex,
      preferredName 
    } = body

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
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

    // Normalize sex values
    const normalizeSex = (sexValue: string | undefined): string | undefined => {
      if (!sexValue) return undefined
      const lower = sexValue.toLowerCase().trim()
      if (lower.includes('hombre') || lower.includes('male') || lower === 'm') return 'male'
      if (lower.includes('mujer') || lower.includes('female') || lower === 'f') return 'female'
      if (lower.includes('otro') || lower.includes('other')) return 'other'
      return sexValue // Keep original if no match
    }

    // Normalize goal values
    const normalizeGoal = (goalValue: string | undefined): string | undefined => {
      if (!goalValue) return undefined
      const lower = goalValue.toLowerCase().trim()
      if (lower.includes('ganar') && lower.includes('músculo')) return 'muscle_gain'
      if (lower.includes('perder') && lower.includes('grasa')) return 'fat_loss'
      if (lower.includes('recomposición') || lower.includes('recomp')) return 'recomposition'
      if (lower.includes('mantenimiento') || lower.includes('mantener')) return 'maintenance'
      if (lower.includes('fuerza') || lower.includes('strength')) return 'strength'
      return goalValue // Keep original if no match
    }

    const profileData: any = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    // Map camelCase to snake_case and only update if value is provided
    if (fullName) profileData.full_name = fullName
    if (preferredName) profileData.preferred_name = preferredName
    if (heightCm !== undefined && heightCm !== null && heightCm !== '') {
      profileData.height_cm = Number(heightCm)
    }
    if (weightKg !== undefined && weightKg !== null && weightKg !== '') {
      profileData.weight_kg = Number(weightKg)
    }
    if (goal) profileData.goal = normalizeGoal(goal)
    if (sex) profileData.sex = normalizeSex(sex)
    if (user.email) profileData.email = user.email

    if (existingProfile) {
      // Normalize sex values
      const normalizeSex = (sexValue: string | undefined): string | undefined => {
        if (!sexValue) return undefined
        const lower = sexValue.toLowerCase().trim()
        if (lower.includes('hombre') || lower.includes('male') || lower === 'm') return 'male'
        if (lower.includes('mujer') || lower.includes('female') || lower === 'f') return 'female'
        if (lower.includes('otro') || lower.includes('other')) return 'other'
        return sexValue // Keep original if no match
      }

      // Normalize goal values
      const normalizeGoal = (goalValue: string | undefined): string | undefined => {
        if (!goalValue) return undefined
        const lower = goalValue.toLowerCase().trim()
        if (lower.includes('ganar') && lower.includes('músculo')) return 'muscle_gain'
        if (lower.includes('perder') && lower.includes('grasa')) return 'fat_loss'
        if (lower.includes('recomposición') || lower.includes('recomp')) return 'recomposition'
        if (lower.includes('mantenimiento') || lower.includes('mantener')) return 'maintenance'
        if (lower.includes('fuerza') || lower.includes('strength')) return 'strength'
        return goalValue // Keep original if no match
      }

      // Update existing profile - only update fields that are provided
      const updateData: any = {}
      if (fullName !== undefined) updateData.full_name = fullName
      if (preferredName !== undefined) updateData.preferred_name = preferredName
      if (heightCm !== undefined && heightCm !== null && heightCm !== '') {
        updateData.height_cm = Number(heightCm)
      }
      if (weightKg !== undefined && weightKg !== null && weightKg !== '') {
        updateData.weight_kg = Number(weightKg)
      }
      if (goal !== undefined) updateData.goal = normalizeGoal(goal)
      if (sex !== undefined) updateData.sex = normalizeSex(sex)
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update(updateData)
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

      return NextResponse.json({ 
        success: true,
        profile: data
      })
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

      return NextResponse.json({ 
        success: true,
        profile: data
      })
    }
  } catch (error: any) {
    console.error('Save setup data error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      stack: error.stack 
    }, { status: 500 })
  }
}

