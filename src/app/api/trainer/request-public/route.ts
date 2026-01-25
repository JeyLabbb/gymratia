import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener perfil de entrenador
    const { data: trainer, error: trainerError } = await supabaseAdmin
      .from('trainers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (trainerError || !trainer) {
      return NextResponse.json({ error: 'No tienes un perfil de entrenador' }, { status: 404 })
    }

    // En desarrollo, permitir múltiples solicitudes para probar
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Validar que no esté ya en PENDING_REVIEW o PUBLIC (solo en producción)
    if (!isDevelopment) {
      if (trainer.visibility_status === 'PENDING_REVIEW') {
        return NextResponse.json({ error: 'Ya tienes una solicitud pendiente de revisión' }, { status: 400 })
      }

      if (trainer.visibility_status === 'PUBLIC') {
        return NextResponse.json({ error: 'Tu perfil ya es público' }, { status: 400 })
      }
    }

    // Validar mínimos obligatorios
    const missingFields: string[] = []
    
    // Verificar que tenga al menos un certificado subido (archivo)
    const { data: certificates } = await supabaseAdmin
      .from('trainer_certificates')
      .select('id, certificate_name, certificate_file_url, certificate_file_name, issuing_organization, issue_date')
      .eq('trainer_id', trainer.id)
      .not('certificate_file_url', 'is', null)
    
    if (!certificates || certificates.length === 0) {
      missingFields.push('Certificado/título (archivo)')
    }
    
    if (!trainer.social_handle) {
      missingFields.push('Usuario/handle de redes sociales (Instagram/TikTok/X)')
    }
    if (!trainer.social_proof) {
      missingFields.push('Clientes satisfechos o prueba social')
    }
    if (!trainer.description) {
      missingFields.push('Descripción/bio')
    }

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: 'Faltan campos obligatorios',
        missingFields
      }, { status: 400 })
    }

    // Generar token único para revisión (un solo uso, expira en 7 días)
    const reviewToken = crypto.randomBytes(32).toString('hex')
    const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/review-trainer?token=${reviewToken}`

    // Actualizar estado a PENDING_REVIEW
    const { error: updateError } = await supabaseAdmin
      .from('trainers')
      .update({
        visibility_status: 'PENDING_REVIEW',
        requested_at: new Date().toISOString(),
        admin_review_token: reviewToken
      })
      .eq('id', trainer.id)

    if (updateError) {
      console.error('Error actualizando trainer:', updateError)
      return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
    }

    // Enviar email a admin - llamar directamente a la función sin fetch HTTP
    try {
      // Importar dinámicamente el módulo de email
      const emailModule = await import('@/app/api/admin/send-review-email/route')
      
      // Crear un Request object simulado para el handler
      const emailRequest = new Request('http://localhost/api/admin/send-review-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainerId: trainer.id,
          trainerName: trainer.trainer_name,
          trainerEmail: trainer.email || user.email,
          reviewUrl,
          trainerData: {
            avatar_url: trainer.avatar_url,
            hasCertificates: (certificates && certificates.length > 0) || false,
            certificates: certificates || [],
            social_handle: trainer.social_handle,
            social_proof: trainer.social_proof,
            description: trainer.description,
            specialty: trainer.specialty,
            philosophy: trainer.philosophy,
            experience_years: trainer.experience_years
          }
        })
      })

      // Llamar directamente a la función POST del handler
      const emailResponse = await emailModule.POST(emailRequest)
      
      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ Error enviando email:', emailResponse.status, errorData)
      } else {
        const emailData = await emailResponse.json().catch(() => ({}))
        console.log('✅ Email enviado correctamente:', emailData)
      }
    } catch (emailError: any) {
      console.error('❌ Error en envío de email:', emailError?.message || emailError)
      if (emailError?.cause) {
        console.error('Causa del error:', emailError.cause)
      }
      if (emailError?.stack) {
        console.error('Stack:', emailError.stack)
      }
      // No fallar la solicitud si el email falla
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitud enviada correctamente. Recibirás una notificación cuando sea revisada.'
    })
  } catch (error: any) {
    console.error('Error en solicitud de público:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

