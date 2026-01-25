import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// POST /api/social/views?postId=xxx - Registrar una visita
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    let userId = null

    // Intentar obtener usuario si hay token
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id || null
    }

    const searchParams = req.nextUrl.searchParams
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json(
        { error: 'postId es requerido' },
        { status: 400 }
      )
    }

    // Crear cliente para insertar (puede ser anónimo)
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Registrar visita (puede ser anónima)
    // La columna viewed_hour se genera automáticamente desde viewed_at
    const { error } = await supabase
      .from('post_views')
      .insert({
        post_id: postId,
        user_id: userId
      })

    if (error) {
      // Si ya existe (mismo usuario misma hora), no es un error - simplemente no cuenta como nueva vista
      if (error.code === '23505') {
        return NextResponse.json({ success: true, message: 'View already registered for this hour' })
      }
      console.error('Error registering view:', error)
      // No fallar si hay error, solo loguear
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in POST /api/social/views:', error)
    // No fallar, solo loguear
    return NextResponse.json({ success: true })
  }
}

