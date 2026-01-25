import { NextResponse } from 'next/server'
import { Resend } from 'resend'

// Inicializar Resend con la API key desde variables de entorno
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { trainerId, trainerName, trainerEmail, reviewUrl, trainerData } = body

    // Verificar que la API key esté configurada
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY no está configurada en las variables de entorno')
      console.log('=== EMAIL DE REVISIÓN DE ENTRENADOR (DEV) ===')
      console.log('Para: jeylabbb@gmail.com')
      console.log('Asunto: Solicitud de entrenador público:', trainerName)
      console.log('Link de revisión:', reviewUrl)
      console.log('Datos del entrenador:', JSON.stringify(trainerData, null, 2))
      console.log('========================================')
      // En desarrollo, retornar éxito pero loguear
      return NextResponse.json({ 
        success: true, 
        message: 'Email logged (RESEND_API_KEY not configured)',
        dev: true
      })
    }

    // Obtener el dominio de email desde variables de entorno o usar uno por defecto
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const adminEmail = process.env.ADMIN_EMAIL || 'jeylabbb@gmail.com'

    // Crear el HTML del email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #FF2D2D 0%, #FF3D3D 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .info-box {
              background: white;
              border-left: 4px solid #FF2D2D;
              padding: 15px;
              margin: 15px 0;
              border-radius: 4px;
            }
            .button {
              display: inline-block;
              background: #FF2D2D;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .button:hover {
              background: #FF3D3D;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Nueva Solicitud de Entrenador Público</h1>
          </div>
          <div class="content">
            <p>Hola,</p>
            <p>Se ha recibido una nueva solicitud para aparecer como entrenador público en GymRatIA.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #FF2D2D;">Datos del Entrenador</h3>
              <p><strong>Nombre:</strong> ${trainerName}</p>
              <p><strong>Email:</strong> ${trainerEmail}</p>
              <p><strong>ID:</strong> ${trainerId}</p>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #FF2D2D;">Información del Perfil</h3>
              ${trainerData.hasCertificates ? `
                <p><strong>Certificados:</strong> ${trainerData.certificates?.length || 0} certificado(s) subido(s)</p>
                ${trainerData.certificates && trainerData.certificates.length > 0 ? `
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    ${trainerData.certificates.map((cert: any) => `
                      <li style="margin: 8px 0;">
                        <strong>${cert.certificate_name || 'Sin nombre'}</strong>
                        ${cert.issuing_organization ? `<br/>Organización: ${cert.issuing_organization}` : ''}
                        ${cert.issue_date ? `<br/>Fecha de emisión: ${new Date(cert.issue_date).toLocaleDateString('es-ES')}` : ''}
                        ${cert.certificate_file_url ? `<br/><a href="${cert.certificate_file_url}" target="_blank" style="color: #FF2D2D; text-decoration: underline;">Ver certificado</a>` : ''}
                      </li>
                    `).join('')}
                  </ul>
                ` : ''}
              ` : '<p><strong>Certificados:</strong> No tiene certificados subidos</p>'}
              ${trainerData.social_handle ? `<p><strong>Redes Sociales:</strong> ${trainerData.social_handle}</p>` : ''}
              ${trainerData.social_proof ? `<p><strong>Prueba Social:</strong> ${trainerData.social_proof.substring(0, 200)}${trainerData.social_proof.length > 200 ? '...' : ''}</p>` : ''}
              ${trainerData.description ? `<p><strong>Descripción:</strong> ${trainerData.description}</p>` : ''}
              ${trainerData.specialty ? `<p><strong>Especialidad:</strong> ${trainerData.specialty}</p>` : ''}
              ${trainerData.experience_years ? `<p><strong>Experiencia:</strong> ${trainerData.experience_years}</p>` : ''}
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${reviewUrl}" class="button">Revisar Solicitud</a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              <strong>Nota:</strong> Este link es único y de un solo uso. Expira en 7 días.
            </p>
          </div>
          <div class="footer">
            <p>Este es un email automático de GymRatIA. Por favor, no respondas a este email.</p>
          </div>
        </body>
      </html>
    `

    // Enviar el email
    console.log('Intentando enviar email a:', adminEmail)
    console.log('Desde:', fromEmail)
    console.log('API Key configurada:', !!process.env.RESEND_API_KEY)
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: `Solicitud de entrenador público: ${trainerName}`,
      html: emailHtml,
    })

    if (error) {
      console.error('Error enviando email con Resend:', error)
      console.error('Detalles del error:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: error.message || 'Error enviando email', details: error },
        { status: 500 }
      )
    }

    console.log('✅ Email enviado correctamente a:', adminEmail)
    console.log('ID del email:', data?.id)
    return NextResponse.json({ success: true, data, sentTo: adminEmail })
  } catch (error: any) {
    console.error('Error enviando email:', error)
    return NextResponse.json(
      { error: error.message || 'Error enviando email' },
      { status: 500 }
    )
  }
}
