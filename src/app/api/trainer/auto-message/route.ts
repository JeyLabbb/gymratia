import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { personas, getTrainerBySlug } from '@/lib/personas'
import { chatConversational } from '@/lib/openai-chat'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { trainerSlug } = body

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Jey y Edu son entrenadores separados ahora
    const trainer = getTrainerBySlug(trainerSlug)
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
    }

    // Get or create chat
    let { data: chat, error: chatError } = await supabase
      .from('trainer_chats')
      .select('*')
      .eq('user_id', user.id)
      .eq('trainer_slug', trainerSlug)
      .single()

    if (chatError && chatError.code === 'PGRST116') {
      // Create chat if it doesn't exist
      const { data: newChat, error: createError } = await supabase
        .from('trainer_chats')
        .insert({
          user_id: user.id,
          trainer_slug: trainerSlug,
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
      }
      chat = newChat
    } else if (chatError) {
      return NextResponse.json({ error: 'Failed to get chat' }, { status: 500 })
    }

    // Get unread notifications for this trainer
    const { data: notifications } = await supabase
      .from('trainer_notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('trainer_slug', trainerSlug)
      .eq('read', false)
      .order('created_at', { ascending: true })

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ message: 'No new notifications' })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Get the most recent weight from progress_tracking (more up-to-date than profile)
    const { data: latestWeightEntry } = await supabase
      .from('progress_tracking')
      .select('weight_kg')
      .eq('user_id', user.id)
      .not('weight_kg', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const latestWeight = latestWeightEntry?.weight_kg || profile?.weight_kg

    // Get previous messages for context
    const { data: previousMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true })

    const messageHistory = (previousMessages || []).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // Build a more natural context for the trainer
    const changesContext = notifications
      .map((n) => {
        const data = n.data as any
        if (data.field_name === 'weight_kg') {
          const oldWeight = parseFloat(data.old_value || '0')
          const newWeight = parseFloat(data.new_value || '0')
          const diff = newWeight - oldWeight
          if (diff > 0) {
            return `El usuario ha subido de peso de ${data.old_value} kg a ${data.new_value} kg.`
          } else if (diff < 0) {
            return `El usuario ha bajado de peso de ${data.old_value} kg a ${data.new_value} kg.`
          }
          return `El usuario ha actualizado su peso a ${data.new_value} kg.`
        } else if (data.field_name === 'height_cm') {
          return `El usuario ha actualizado su altura a ${data.new_value} cm.`
        } else if (data.field_name === 'goal') {
          return `El usuario ha cambiado su objetivo de "${data.old_value}" a "${data.new_value}".`
        } else if (data.field_name === 'preferred_name') {
          return `El usuario prefiere que le llames "${data.new_value}" ahora.`
        } else if (data.field_name === 'sex') {
          return `El usuario ha actualizado su información personal.`
        }
        return null
      })
      .filter(Boolean)
      .join(' ')

    // Create a natural message for the trainer to respond to
    const systemPrompt = `El usuario acaba de actualizar su perfil. ${changesContext}

Responde de forma natural y conversacional según tu personalidad. 
${trainer.slug === 'jey' 
  ? 'Eres EDU: el entrenador MÁS DURO. Serio, directo, intenso, culturista profesional de élite. NO eres amigable. NO eres comprensivo con excusas. Eres EXIGENTE, SIN PIEDAD y SIN RODEOS. Si el peso ha bajado mucho sin razón aparente, pregunta DIRECTAMENTE y con DUREZA si está siguiendo el plan o si hay algún problema. No aceptes excusas. Si ha mejorado significativamente, reconócelo brevemente sin exagerar - sé realista y profesional, no efusivo. Si cambió el objetivo, pregunta de forma directa y seria si quiere ajustar el plan. Si hay retrocesos, sé DURO y CLARO. Sé firme, serio, directo y exigente. NO uses emojis. NO uses lenguaje amigable ni empático. Mantén un tono profesional, serio y exigente en TODO momento. Eres para personas que funcionan con PRESIÓN.' 
  : 'Eres CAROLINA: amable, comprensiva, enfocada en salud y sostenibilidad. Reconoce los cambios positivamente. Si el peso cambió, pregunta cómo se siente con el cambio. Si cambió el objetivo, ofrece ayuda para ajustar el plan de forma sostenible. Sé alentadora y comprensiva.'}

Mantén tu personalidad en todo momento. Responde como si acabaras de enterarte de estos cambios y quieres comentarlos o preguntar sobre ellos de forma natural. NO menciones que es una "notificación" o "actualización del sistema" - actúa como si te hubieras dado cuenta tú mismo.`

    // Generate trainer's response with better context
    const userContextMessage = `He actualizado mi perfil. ${changesContext}`

    const trainerMessage = await chatConversational(
      trainer,
      [
        ...messageHistory,
        {
          role: 'user',
          content: userContextMessage,
        },
      ],
      {
        fullName: profile?.preferred_name || profile?.full_name,
        height_cm: profile?.height_cm,
        weight_kg: latestWeight, // Use most recent weight from progress_tracking
        goal: profile?.goal,
        sex: profile?.sex,
        recentChanges: systemPrompt,
      }
    )

    // Save trainer's message
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
        last_message_at: new Date().toISOString(),
      })
      .eq('id', chat.id)

    // Mark notifications as read
    await supabase
      .from('trainer_notifications')
      .update({ read: true })
      .in('id', notifications.map((n) => n.id))

    return NextResponse.json({ 
      success: true, 
      message: trainerMessage,
      trainerName: trainer.name 
    })
  } catch (error: any) {
    console.error('Error generating auto message:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

