import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const BUCKET = 'chat-images'

/** POST /api/upload-chat-image - Upload and optionally compress image for chat */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('image') as File | null
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Image file required' }, { status: 400 })
    }

    const mime = file.type?.toLowerCase() || ''
    if (!ALLOWED_TYPES.some(t => mime.includes(t.split('/')[1]))) {
      return NextResponse.json(
        { error: 'Formato no permitido. Usa JPG, PNG, WebP o HEIC.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Imagen demasiado grande. Máximo 5MB.' },
        { status: 400 }
      )
    }

    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (error) {
      if (error.message?.includes('Bucket') || error.message?.includes('not found')) {
        return NextResponse.json(
          { error: 'Bucket chat-images no configurado. Ejecuta create-chat-images-bucket.sql' },
          { status: 500 }
        )
      }
      throw error
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
    return NextResponse.json({ imageUrl: publicUrl })
  } catch (error: any) {
    console.error('Upload chat image error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al subir la imagen' },
      { status: 500 }
    )
  }
}
