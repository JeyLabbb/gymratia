import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTrainerBySlug } from '@/lib/personas'
import OpenAI from 'openai'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { trainerSlug, answers } = body

    if (!trainerSlug || !answers) {
      return NextResponse.json(
        { error: 'trainerSlug y answers son requeridos' },
        { status: 400 }
      )
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const trainer = getTrainerBySlug(trainerSlug)
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
    }

    if (!trainer.persona?.system) {
      return NextResponse.json(
        { error: 'Trainer persona no configurada correctamente' },
        { status: 500 }
      )
    }

    // Verificar que OpenAI API key esté configurada
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY no está configurada')
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      )
    }

    // Generar resumen usando OpenAI
    const prompt = `Eres ${trainer.name}, ${trainer.headline}.

El usuario ha respondido estas preguntas:
${Object.entries(answers).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

Genera un resumen breve (2-3 párrafos máximo) de cómo trabajarías con este usuario. Sé entusiasta pero realista. Menciona:
- Qué tipo de plan le harías
- Cómo adaptarías tu metodología a sus necesidades
- Qué esperar en las primeras semanas

Mantén el tono de ${trainer.name}.

Responde SOLO con el resumen, sin introducciones ni despedidas.`

    console.log('Generando resumen para trainer:', trainerSlug)

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: trainer.persona.system
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    })

    const summary = completion.choices[0]?.message?.content

    if (!summary || summary.trim().length === 0) {
      console.error('OpenAI devolvió respuesta vacía')
      return NextResponse.json(
        { error: 'No se pudo generar el resumen. Intenta de nuevo.' },
        { status: 500 }
      )
    }

    console.log('Resumen generado exitosamente')
    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error('Error generando resumen:', error)
    
    // Errores específicos de OpenAI
    if (error?.status === 401 || error?.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Error de configuración del servidor. Contacta al administrador.' },
        { status: 500 }
      )
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor, espera un momento e intenta de nuevo.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: error?.message || 'Error generando resumen. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}

