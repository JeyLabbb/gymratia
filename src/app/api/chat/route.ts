import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { personas } from '@/lib/personas'
import { chatConversational } from '@/lib/openai-chat'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for server-side
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { chatId, message, trainerSlug } = body

    // Get auth token from header
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

    // Get or create chat
    let chat
    if (chatId) {
      const { data, error } = await supabase
        .from('trainer_chats')
        .select('*')
        .eq('id', chatId)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      }
      chat = data
    } else {
      // Create new chat
      const { data, error } = await supabase
        .from('trainer_chats')
        .insert({
          user_id: user.id,
          trainer_slug: trainerSlug,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating chat:', error)
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
      }
      chat = data
    }

    // Get user profile for context
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Get recent profile changes/notifications for this trainer
    const { data: recentNotifications } = await supabase
      .from('trainer_notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('trainer_slug', trainerSlug)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(3)

    // Get previous messages
    const { data: previousMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true })

    const messageHistory = (previousMessages || []).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // Add user message
    messageHistory.push({
      role: 'user',
      content: message,
    })

    // Save user message
    await supabase.from('chat_messages').insert({
      chat_id: chat.id,
      role: 'user',
      content: message,
    })

    // Build context with profile and recent changes
    const userContext = profile
      ? {
          fullName: profile.preferred_name || profile.full_name,
          height_cm: profile.height_cm,
          weight_kg: profile.weight_kg,
          goal: profile.goal,
          sex: profile.sex,
          recentChanges: recentNotifications?.map(n => n.message).join(' ') || undefined,
        }
      : undefined

    // Get AI response
    const aiResponse = await chatConversational(
      trainer,
      messageHistory,
      userContext
    )

    // Mark notifications as read after trainer responds
    if (recentNotifications && recentNotifications.length > 0) {
      await supabase
        .from('trainer_notifications')
        .update({ read: true })
        .in('id', recentNotifications.map(n => n.id))
    }

    // Save AI response
    await supabase.from('chat_messages').insert({
      chat_id: chat.id,
      role: 'assistant',
      content: aiResponse,
    })

    // Update chat timestamp
    await supabase
      .from('trainer_chats')
      .update({ updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() })
      .eq('id', chat.id)

    return NextResponse.json({
      chatId: chat.id,
      message: aiResponse,
    })
  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const chatId = searchParams.get('chatId')

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (chatId) {
      // Get messages for specific chat
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
      }

      return NextResponse.json({ messages: messages || [] })
    } else {
      // Get all chats for user
      const { data: chats, error } = await supabase
        .from('trainer_chats')
        .select('*')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 })
      }

      return NextResponse.json({ chats: chats || [] })
    }
  } catch (error: any) {
    console.error('Get chat error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

