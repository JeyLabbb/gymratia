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
      userId,
      trainerName,
      specialty,
      description,
      experience,
      philosophy,
      visibilityStatus,
      certificates
    } = body

    if (!userId || !trainerName) {
      return NextResponse.json(
        { error: 'userId y trainerName son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Normalizar nombre para validación (case-insensitive, sin espacios extra)
    const normalizedName = trainerName.trim().toLowerCase()
    
    // Verificar que el nombre sea único (case-insensitive)
    const { data: existingName } = await supabaseAdmin
      .from('trainers')
      .select('id')
      .ilike('trainer_name', normalizedName)
      .maybeSingle()
    
    if (existingName) {
      return NextResponse.json(
        { error: 'Este nombre ya está en uso. Elige otro nombre único.' },
        { status: 400 }
      )
    }

    // Generar slug único
    let baseSlug = normalizedName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
      .trim()
      .replace(/\s+/g, '-') // Espacios a guiones
      .replace(/-+/g, '-') // Múltiples guiones a uno
    
    if (!baseSlug) {
      baseSlug = 'trainer'
    }
    
    // Verificar si slug existe y añadir número si es necesario
    let slug = baseSlug
    let counter = 0
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from('trainers')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      
      if (!existing) {
        break
      }
      counter++
      slug = `${baseSlug}-${counter}`
    }

    // Verificar que no existe ya un trainer para este usuario
    const { data: existingTrainer } = await supabaseAdmin
      .from('trainers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingTrainer) {
      return NextResponse.json(
        { error: 'Ya existe un perfil de entrenador para este usuario' },
        { status: 400 }
      )
    }

    // Generar link único para acceso privado
    const activationLink = `${slug}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    // Determinar visibility_status basado en el valor recibido
    // Si es PRIVATE, usar DRAFT. Si es REQUEST_ACCESS o PUBLIC, usar PENDING_REVIEW (requiere solicitud)
    let finalVisibilityStatus = 'DRAFT'
    if (visibilityStatus === 'PUBLIC' || visibilityStatus === 'REQUEST_ACCESS') {
      // Si eligen público o solicitud de acceso, deben completar la solicitud primero
      // Por ahora lo dejamos como DRAFT y luego pueden solicitar
      finalVisibilityStatus = 'DRAFT'
    }

    // Crear perfil de entrenador con estado DRAFT por defecto (siempre privado al crear)
    const { data: trainer, error: trainerError } = await supabaseAdmin
      .from('trainers')
      .insert({
        user_id: userId,
        slug: slug,
        trainer_name: trainerName,
        full_name: user.user_metadata?.full_name || user.user.email?.split('@')[0],
        email: user.user.email,
        specialty: specialty || null,
        description: description || null,
        philosophy: philosophy || null,
        experience_years: experience || null,
        privacy_mode: 'private', // Siempre privado al crear
        activation_link: activationLink,
        visibility_status: finalVisibilityStatus, // DRAFT por defecto (privado)
        is_active: true,
        is_verified: false,
        verification_status: 'pending'
      })
      .select()
      .single()

    if (trainerError) {
      console.error('Error creando trainer:', trainerError)
      
      // Si el error es sobre la columna "name", dar instrucciones claras
      if (trainerError.message?.includes('column "name"')) {
        return NextResponse.json(
          { 
            error: 'La tabla trainers tiene una columna "name" en lugar de "trainer_name". Ejecuta el script fix-trainers-table.sql en Supabase SQL Editor para corregirlo automáticamente.' 
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: `Error creando perfil de entrenador: ${trainerError.message}` },
        { status: 500 }
      )
    }

    // Si hay certificados, guardarlos
    if (certificates && Array.isArray(certificates) && certificates.length > 0) {
      const certificatesData = certificates.map((cert: any) => ({
        trainer_id: trainer.id,
        certificate_name: cert.name || '',
        issuing_organization: cert.organization || null,
        issue_date: cert.issueDate || null,
        expiry_date: cert.expiryDate || null,
        certificate_file_url: cert.fileUrl || null,
        certificate_file_name: cert.fileName || null,
        verification_status: 'pending'
      }))

      const { error: certError } = await supabaseAdmin
        .from('trainer_certificates')
        .insert(certificatesData)

      if (certError) {
        console.error('Error guardando certificados:', certError)
        // No fallar si los certificados fallan, el trainer ya está creado
      }
    }

    return NextResponse.json({
      success: true,
      trainer: {
        id: trainer.id,
        slug: trainer.slug,
        trainer_name: trainer.trainer_name || trainer.name || 'Entrenador'
      }
    })
  } catch (error: any) {
    console.error('Error en registro de entrenador:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

