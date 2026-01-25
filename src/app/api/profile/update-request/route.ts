import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    console.log('👤👤👤 ========== AUTO-SAVE PROFILE UPDATE ==========')
    const body = await req.json()
    const { 
      updateType, 
      updateData 
    } = body

    console.log('👤👤👤 Update request received:', {
      updateType,
      updateDataKeys: Object.keys(updateData || {})
    })

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      console.error('❌❌❌ No authorization header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('❌❌❌ Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('👤👤👤 User authenticated:', user.id)

    if (updateType === 'profile') {
      // Update profile fields
      console.log('👤👤👤 Updating profile fields')
      const { field, value } = updateData
      
      console.log('👤👤👤 Update data:', { field, value })
      
      const profileUpdate: any = {}
      if (field === 'weight_kg') {
        profileUpdate.weight_kg = Number(value)
      } else if (field === 'height_cm') {
        let heightValue = Number(value)
        if (heightValue > 0 && heightValue < 100) {
          heightValue = heightValue * 100
        }
        profileUpdate.height_cm = Math.round(heightValue)
      } else if (field === 'preferred_name') {
        profileUpdate.preferred_name = value
      } else if (field === 'full_name') {
        profileUpdate.full_name = value
      } else if (field === 'goal') {
        profileUpdate.goal = value
      } else if (field === 'sex') {
        profileUpdate.sex = value
      } else if (field === 'preferred_meal_times') {
        profileUpdate.preferred_meal_times = value
      } else if (field === 'training_schedule') {
        profileUpdate.training_schedule = value
      }

      console.log('👤👤👤 Profile update object:', profileUpdate)

      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          ...profileUpdate,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('❌❌❌ ERROR updating profile:', updateError)
        console.error('❌ Error details:', JSON.stringify(updateError, null, 2))
        return NextResponse.json({ error: `Failed to update profile: ${updateError.message}` }, { status: 500 })
      }

      console.log('✅✅✅ Profile UPDATED successfully:', {
        user_id: user.id,
        field,
        value,
        updatedProfile: updatedProfile ? {
          id: updatedProfile.id,
          [field]: updatedProfile[field as keyof typeof updatedProfile]
        } : 'No data returned'
      })

      // Verify it was saved
      const { data: verifyData } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (verifyData) {
        console.log('✅✅✅ VERIFICATION: Profile confirmed in database:', {
          user_id: verifyData.user_id,
          [field]: verifyData[field as keyof typeof verifyData]
        })
      } else {
        console.error('❌❌❌ VERIFICATION FAILED: Profile not found in database after update!')
      }

      console.log('👤👤👤 ========== END AUTO-SAVE PROFILE UPDATE ==========')
      return NextResponse.json({ success: true, profile: updatedProfile })
    } else if (updateType === 'progress') {
      // Add progress record (e.g., weight log)
      console.log('👤👤👤 Adding progress record only')
      const { date, weight_kg, body_fat_percentage, measurements, notes } = updateData

      console.log('👤👤👤 Progress data:', {
        date,
        weight_kg,
        body_fat_percentage,
        hasMeasurements: !!measurements,
        hasNotes: !!notes
      })

      const progressData: any = {
        user_id: user.id,
        date: date || new Date().toISOString().split('T')[0],
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

      console.log('👤👤👤 Progress record to insert:', progressData)

      const { data: progress, error: progressError } = await supabaseAdmin
        .from('progress_tracking')
        .insert(progressData)
        .select()
        .single()

      if (progressError) {
        console.error('❌❌❌ ERROR saving progress:', progressError)
        console.error('❌ Error details:', JSON.stringify(progressError, null, 2))
        return NextResponse.json({ error: `Failed to save progress: ${progressError.message}` }, { status: 500 })
      }

      console.log('✅✅✅ Progress record CREATED successfully:', {
        id: progress?.id,
        date: progress?.date,
        weight_kg: progress?.weight_kg
      })

      // If weight was logged, also update the profile weight
      if (weight_kg !== undefined && weight_kg !== null) {
        console.log('👤👤👤 Also updating profile weight to:', weight_kg)
        const { error: profileUpdateError } = await supabaseAdmin
          .from('user_profiles')
          .update({ 
            weight_kg: Number(weight_kg),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)

        if (profileUpdateError) {
          console.error('❌❌❌ ERROR updating profile weight:', profileUpdateError)
        } else {
          console.log('✅✅✅ Profile weight UPDATED successfully')
        }
      }

      console.log('👤👤👤 ========== END AUTO-SAVE PROFILE UPDATE ==========')
      return NextResponse.json({ success: true, progress })
    } else if (updateType === 'profile_and_progress') {
      // Update profile and add progress record (e.g., update weight and log it)
      console.log('👤👤👤 Updating profile AND progress')
      const { profileField, profileValue, progressData: progress } = updateData

      console.log('👤👤👤 Update data:', {
        profileField,
        profileValue,
        hasProgressData: !!progress,
        progressDate: progress?.date
      })

      // Update profile
      const profileUpdate: any = {}
      if (profileField === 'weight_kg') {
        profileUpdate.weight_kg = Number(profileValue)
      } else if (profileField === 'height_cm') {
        let heightValue = Number(profileValue)
        if (heightValue > 0 && heightValue < 100) {
          heightValue = heightValue * 100
        }
        profileUpdate.height_cm = Math.round(heightValue)
      } else if (profileField === 'preferred_name') {
        profileUpdate.preferred_name = profileValue
      } else if (profileField === 'full_name') {
        profileUpdate.full_name = profileValue
      }

      console.log('👤👤👤 Profile update object:', profileUpdate)

      const { data: updatedProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          ...profileUpdate,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (profileError) {
        console.error('❌❌❌ ERROR updating profile:', profileError)
        console.error('❌ Error details:', JSON.stringify(profileError, null, 2))
        return NextResponse.json({ error: `Failed to update profile: ${profileError.message}` }, { status: 500 })
      }

      console.log('✅✅✅ Profile UPDATED successfully:', {
        user_id: user.id,
        profileField,
        profileValue,
        updatedProfile: updatedProfile ? {
          id: updatedProfile.id,
          [profileField]: updatedProfile[profileField as keyof typeof updatedProfile]
        } : 'No data returned'
      })

      // Add progress record
      if (progress) {
        const progressRecord: any = {
          user_id: user.id,
          date: progress.date || new Date().toISOString().split('T')[0],
        }

        if (progress.weight_kg !== undefined && progress.weight_kg !== null) {
          progressRecord.weight_kg = Number(progress.weight_kg)
        }
        if (progress.body_fat_percentage !== undefined && progress.body_fat_percentage !== null) {
          progressRecord.body_fat_percentage = Number(progress.body_fat_percentage)
        }
        if (progress.measurements) {
          progressRecord.measurements = progress.measurements
        }
        if (progress.notes) {
          progressRecord.notes = progress.notes
        }

        console.log('👤👤👤 Inserting progress record:', progressRecord)

        const { data: insertedProgress, error: progressError } = await supabaseAdmin
          .from('progress_tracking')
          .insert(progressRecord)
          .select()
          .single()

        if (progressError) {
          console.error('❌❌❌ ERROR saving progress record:', progressError)
          console.error('❌ Error details:', JSON.stringify(progressError, null, 2))
          // Don't fail the request if progress save fails
        } else {
          console.log('✅✅✅ Progress record CREATED successfully:', {
            id: insertedProgress?.id,
            date: insertedProgress?.date,
            weight_kg: insertedProgress?.weight_kg
          })
        }
      }

      // Verify profile was saved
      const { data: verifyData } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (verifyData) {
        console.log('✅✅✅ VERIFICATION: Profile confirmed in database:', {
          user_id: verifyData.user_id,
          [profileField]: verifyData[profileField as keyof typeof verifyData]
        })
      } else {
        console.error('❌❌❌ VERIFICATION FAILED: Profile not found in database after update!')
      }

      console.log('👤👤👤 ========== END AUTO-SAVE PROFILE UPDATE ==========')
      return NextResponse.json({ success: true, profile: updatedProfile })
    }

    console.error('❌❌❌ Invalid update type:', updateType)
    return NextResponse.json({ error: 'Invalid update type' }, { status: 400 })
  } catch (error: any) {
    console.error('❌❌❌ Update request error:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.log('👤👤👤 ========== END AUTO-SAVE PROFILE UPDATE (ERROR) ==========')
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

