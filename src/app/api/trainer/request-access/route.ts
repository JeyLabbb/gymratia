import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { trainerSlug, message } = body

    if (!trainerSlug) {
      return NextResponse.json({ error: 'trainerSlug es requerido' }, { status: 400 })
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

    // Verificar que el entrenador existe y tiene visibility_status = 'REQUEST_ACCESS'
    const { data: trainer, error: trainerError } = await supabaseAdmin
      .from('trainers')
      .select('id, user_id, trainer_name, visibility_status')
      .eq('slug', trainerSlug)
      .eq('is_active', true)
      .single()

    if (trainerError || !trainer) {
      return NextResponse.json({ error: 'Entrenador no encontrado' }, { status: 404 })
    }

    if (trainer.visibility_status !== 'REQUEST_ACCESS') {
      return NextResponse.json(
        { error: 'Este entrenador no acepta solicitudes de acceso' },
        { status: 400 }
      )
    }

    // Verificar si ya existe una solicitud pendiente
    const { data: existingRequest } = await supabaseAdmin
      .from('trainer_access_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('trainer_id', trainer.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Ya tienes una solicitud pendiente para este entrenador' },
        { status: 400 }
      )
    }

    // Crear solicitud de acceso
    const { data: request, error: requestError } = await supabaseAdmin
      .from('trainer_access_requests')
      .insert({
        user_id: user.id,
        trainer_id: trainer.id,
        message: message || null,
        status: 'pending'
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creando solicitud:', requestError)
      return NextResponse.json(
        { error: `Error creando solicitud: ${requestError.message}` },
        { status: 500 }
      )
    }

    // Crear notificación para el entrenador
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('preferred_name, full_name')
      .eq('user_id', user.id)
      .maybeSingle()

    const userName = userProfile?.preferred_name || userProfile?.full_name || 'Un usuario'

    await supabaseAdmin
      .from('trainer_notifications')
      .insert({
        user_id: trainer.user_id, // Notificación para el entrenador
        trainer_slug: trainerSlug,
        notification_type: 'access_request',
        message: `${userName} ha solicitado acceso a tu perfil de entrenador`,
        data: {
          request_id: request.id,
          requester_user_id: user.id,
          requester_name: userName,
          message: message || null
        },
        read: false
      })

    return NextResponse.json({
      success: true,
      request: {
        id: request.id,
        status: request.status
      }
    })
  } catch (error: any) {
    console.error('Error en solicitud de acceso:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
