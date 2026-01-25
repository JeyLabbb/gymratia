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
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener mensajes del usuario ordenados por fecha (más recientes primero)
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('user_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (messagesError) {
      console.error('Error obteniendo mensajes:', messagesError)
      return NextResponse.json({ error: 'Error obteniendo mensajes' }, { status: 500 })
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (error: any) {
    console.error('Error en GET messages:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
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

    const body = await req.json()
    const { messageId } = body

    if (!messageId) {
      return NextResponse.json({ error: 'messageId requerido' }, { status: 400 })
    }

    // Marcar mensaje como leído
    const { error: updateError } = await supabaseAdmin
      .from('user_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error marcando mensaje como leído:', updateError)
      return NextResponse.json({ error: 'Error actualizando mensaje' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error en PUT messages:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

