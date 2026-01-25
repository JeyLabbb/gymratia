import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token, action } = body // action: 'approve' | 'reject'

    if (!token || !action) {
      return NextResponse.json({ error: 'Token y acción requeridos' }, { status: 400 })
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    // Buscar trainer por token
    const { data: trainer, error: trainerError } = await supabaseAdmin
      .from('trainers')
      .select('*')
      .eq('admin_review_token', token)
      .maybeSingle()

    if (trainerError || !trainer) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 404 })
    }

    // Verificar que esté en PENDING_REVIEW
    if (trainer.visibility_status !== 'PENDING_REVIEW') {
      return NextResponse.json({ error: 'Esta solicitud ya fue procesada' }, { status: 400 })
    }

    // Actualizar estado según acción
    const newStatus = action === 'approve' ? 'PUBLIC' : 'REJECTED'
    const { error: updateError } = await supabaseAdmin
      .from('trainers')
      .update({
        visibility_status: newStatus,
        reviewed_at: new Date().toISOString(),
        admin_review_token: null // Invalidar token después de usar
      })
      .eq('id', trainer.id)

    if (updateError) {
      console.error('Error actualizando trainer:', updateError)
      return NextResponse.json({ error: 'Error al procesar la revisión' }, { status: 500 })
    }

    // Crear mensaje in-app para el entrenador
    const messageTitle = action === 'approve' 
      ? 'Solicitud de entrenador público aceptada'
      : 'Solicitud de entrenador público rechazada'
    
    const messageBody = action === 'approve'
      ? 'Enhorabuena, tu solicitud para ser entrenador público ha sido aceptada. Ya apareces en la app.'
      : 'Lo sentimos, tu solicitud de entrenador ha sido rechazada. Revisa y mejora tus datos proporcionados y vuelve a intentarlo.'

    const { error: messageError } = await supabaseAdmin
      .from('user_messages')
      .insert({
        user_id: trainer.user_id,
        type: action === 'approve' ? 'trainer_review_approved' : 'trainer_review_rejected',
        title: messageTitle,
        body: messageBody
      })

    if (messageError) {
      console.error('Error creando mensaje:', messageError)
      // No fallar si el mensaje no se crea
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve' 
        ? 'Entrenador aprobado correctamente' 
        : 'Entrenador rechazado correctamente'
    })
  } catch (error: any) {
    console.error('Error en revisión:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

