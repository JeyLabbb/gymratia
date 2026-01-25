import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chatConversational } from '@/lib/openai-chat'
import { personas } from '@/lib/personas'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { trainer_slug, trigger, context } = body

    if (!trainer_slug || !trigger || !context) {
      return NextResponse.json({ error: 'trainer_slug, trigger, and context are required' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const trainer = personas.find(p => p.slug === trainer_slug)
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
    }

    // Get or create chat
    let { data: chat, error: chatError } = await supabase
      .from('trainer_chats')
      .select('*')
      .eq('user_id', user.id)
      .eq('trainer_slug', trainer_slug)
      .maybeSingle()

    if (chatError && chatError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to get chat' }, { status: 500 })
    }

    if (!chat) {
      const { data: newChat, error: createError } = await supabase
        .from('trainer_chats')
        .insert({
          user_id: user.id,
          trainer_slug: trainer_slug,
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
      }
      chat = newChat
    }

    // Get recent messages for context
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const messageHistory = (recentMessages || [])
      .reverse()
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }))

    // Create context-aware message based on trigger
    let systemContext = ''
    if (trigger === 'unusual_workout_change') {
      const changeType = context.type
      
      if (changeType === 'stagnation') {
        systemContext = `El usuario lleva ${context.sessions || 5} entrenamientos seguidos haciendo exactamente lo mismo en ${context.exercise}:
- ${context.value} reps x ${context.weight}kg

Esto indica estancamiento. Puede ser por falta de progreso, motivación, dieta, o constancia. Pregunta brevemente qué está pasando y ofrece ayuda para romper el estancamiento. Sé directo pero útil, no sermonees.`
      } else if (changeType === 'drastic_drop') {
        systemContext = `El usuario ha registrado una bajada drástica en ${context.exercise}:
- Antes: ${context.previous} reps x ${context.previousWeight}kg
- Ahora: ${context.value} reps x ${context.weight}kg

Esto es un cambio muy significativo. Pregunta brevemente qué ha pasado (lesión, fatiga, problema técnico, etc.). Sé conciso y útil.`
      } else if (changeType === 'drastic_improvement') {
        systemContext = `El usuario ha registrado una mejora drástica (casi imposible) en ${context.exercise}:
- Antes: ${context.previous} reps x ${context.previousWeight}kg
- Ahora: ${context.value} reps x ${context.weight}kg

Esto parece físicamente improbable. Puede ser un error al registrar los datos. Pregunta brevemente si los datos son correctos, pero sé amable.`
      } else if (changeType === 'unusual_pattern') {
        systemContext = `El usuario ha registrado un patrón inusual en ${context.exercise}:
- Antes: ${context.previous} reps x ${context.previousWeight}kg
- Ahora: ${context.value} reps x ${context.weight}kg

Ha subido peso Y reps significativamente, lo cual es inusual. Normalmente al subir peso, las reps bajan. Pregunta brevemente si los datos son correctos o si hay algo especial que explique esto.`
      } else {
        systemContext = `El usuario acaba de registrar un cambio inusual en su entrenamiento:
- Ejercicio: ${context.exercise}
- Tipo: ${changeType}
- ${context.message || 'Cambio detectado'}

Pregunta brevemente qué ha pasado, pero sé conciso y no seas pesado. Solo una pregunta directa y útil.`
      }
    }

    // Generate trainer message
    const trainerMessage = await chatConversational(
      trainer,
      [
        ...messageHistory,
        {
          role: 'user',
          content: systemContext || `[Sistema: ${trigger}]`
        }
      ],
      {
        fullName: user.email?.split('@')[0] || 'Usuario',
      }
    )

    // Save trainer message
    await supabase.from('chat_messages').insert({
      chat_id: chat.id,
      role: 'assistant',
      content: trainerMessage,
    })

    // Update chat timestamp
    await supabase
      .from('trainer_chats')
      .update({ 
        updated_at: new Date().toISOString(), 
        last_message_at: new Date().toISOString() 
      })
      .eq('id', chat.id)

    // Create notification
    await supabase.from('trainer_notifications').insert({
      user_id: user.id,
      trainer_slug: trainer_slug,
      message: trainerMessage.substring(0, 100) + '...',
      read: false,
    })

    return NextResponse.json({ 
      success: true, 
      message: trainerMessage,
      chatId: chat.id 
    })
  } catch (error: any) {
    console.error('Auto-message error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

