import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { trainerName } = body

    if (!trainerName || trainerName.trim().length < 3) {
      return NextResponse.json(
        { available: false, error: 'El nombre debe tener al menos 3 caracteres' },
        { status: 400 }
      )
    }

    // Normalizar nombre (case-insensitive, trim)
    const normalizedName = trainerName.trim().toLowerCase()

    // Verificar si existe (case-insensitive)
    const { data: existing } = await supabaseAdmin
      .from('trainers')
      .select('id')
      .ilike('trainer_name', normalizedName)
      .maybeSingle()

    return NextResponse.json({
      available: !existing
    })
  } catch (error: any) {
    console.error('Error verificando nombre:', error)
    return NextResponse.json(
      { available: false, error: error.message },
      { status: 500 }
    )
  }
}

