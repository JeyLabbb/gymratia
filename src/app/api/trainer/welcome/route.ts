import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { personas } from '@/lib/personas'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { trainerSlug, chatId } = body

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const trainer = personas.find((p) => p.slug === trainerSlug)
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
    }

    // Verify chat exists and belongs to user
    const { data: chat, error: chatError } = await supabase
      .from('trainer_chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single()

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Check if welcome message already exists
    const { data: existingMessages } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('chat_id', chatId)
      .limit(1)

    if (existingMessages && existingMessages.length > 0) {
      return NextResponse.json({ message: 'Welcome message already sent' })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Generate welcome message based on trainer personality
    const userName = profile?.preferred_name || profile?.full_name || 'Usuario'
    const userGoal = profile?.goal || 'objetivo'
    
    // Use a simpler, faster welcome message instead of calling OpenAI
    // This makes the initial load much faster
    let welcomeMessage: string
    
    if (trainer.slug === 'edu') {
      welcomeMessage = `Soy ${trainer.name}. Has empezado tu plan de ${trainer.cycle_weeks} semanas. Sin excusas, sin mentiras. Si sigues el plan, verás resultados. Si no, no pierdas mi tiempo. ¿Tienes alguna pregunta sobre el entrenamiento o la nutrición?`
    } else {
      welcomeMessage = `Hola${userName !== 'Usuario' ? ` ${userName}` : ''}! Soy ${trainer.name}, tu entrenadora. Estoy aquí para ayudarte a alcanzar tus objetivos de forma sostenible y saludable. Tu objetivo es: ${userGoal}. ¿Tienes alguna pregunta sobre tu plan de ${trainer.cycle_weeks} semanas o sobre nutrición?`
    }

    // Save welcome message
    await supabase.from('chat_messages').insert({
      chat_id: chatId,
      role: 'assistant',
      content: welcomeMessage,
    })

    // Update chat timestamp
    await supabase
      .from('trainer_chats')
      .update({ 
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      })
      .eq('id', chatId)

    return NextResponse.json({ 
      success: true, 
      message: welcomeMessage 
    })
  } catch (error: any) {
    console.error('Error generating welcome message:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

