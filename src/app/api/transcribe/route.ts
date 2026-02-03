import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_FILE_SIZE_MB = 25 // Whisper limit

/** POST /api/transcribe - Transcribe audio to text using OpenAI Whisper */
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
    const file = formData.get('audio') as File | null
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Audio file required' }, { status: 400 })
    }

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_FILE_SIZE_MB) {
      return NextResponse.json(
        { error: `Archivo demasiado grande. Máximo ${MAX_FILE_SIZE_MB}MB.` },
        { status: 400 }
      )
    }

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'es',
      response_format: 'text',
    })

    let text = (typeof transcription === 'string' ? transcription : (transcription as any).text || '').trim()
    // Normalize: remove double spaces, trim
    text = text.replace(/\s+/g, ' ').trim()

    return NextResponse.json({ text })
  } catch (error: any) {
    console.error('Transcribe error:', error)
    const msg = error?.message || 'Error al transcribir'
    return NextResponse.json(
      { error: msg.includes('rate') ? 'Demasiadas solicitudes. Espera un momento.' : msg },
      { status: 500 }
    )
  }
}
