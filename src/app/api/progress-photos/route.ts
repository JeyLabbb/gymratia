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

    const { data: photos, error } = await supabaseAdmin
      .from('progress_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
    }

    return NextResponse.json({ photos: photos || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { photo_url, date, photo_type, notes } = body

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const photoData: any = {
      user_id: user.id,
      photo_url,
      date: date || new Date().toISOString().split('T')[0],
    }

    if (photo_type) {
      photoData.photo_type = photo_type
    }
    if (notes) {
      photoData.notes = notes
    }

    const { data: photo, error } = await supabaseAdmin
      .from('progress_photos')
      .insert(photoData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Failed to save photo: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ photo })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, date, photo_type, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 })
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

    // Verify the photo belongs to the user
    const { data: existingPhoto, error: fetchError } = await supabaseAdmin
      .from('progress_photos')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingPhoto) {
      return NextResponse.json({ error: 'Photo not found or unauthorized' }, { status: 404 })
    }

    // Update photo data
    const updateData: any = {}
    if (date !== undefined) updateData.date = date
    if (photo_type !== undefined) updateData.photo_type = photo_type
    if (notes !== undefined) updateData.notes = notes

    const { data: photo, error } = await supabaseAdmin
      .from('progress_photos')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Failed to update photo: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ photo })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 })
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

    // Get photo to get the file path for deletion
    const { data: photo, error: fetchError } = await supabaseAdmin
      .from('progress_photos')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found or unauthorized' }, { status: 404 })
    }

    // Delete file from storage if photo_url exists
    if (photo.photo_url) {
      try {
        // Extract file path from URL
        // URL format: https://[project].supabase.co/storage/v1/object/public/progress-photos/[user_id]/[filename]
        const urlParts = photo.photo_url.split('/progress-photos/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          const { error: storageError } = await supabaseAdmin.storage
            .from('progress-photos')
            .remove([filePath])

          if (storageError) {
            console.error('Error deleting file from storage:', storageError)
            // Continue with database deletion even if storage deletion fails
          }
        }
      } catch (storageErr) {
        console.error('Error processing storage deletion:', storageErr)
        // Continue with database deletion
      }
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('progress_photos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: `Failed to delete photo: ${deleteError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Photo deleted successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}


