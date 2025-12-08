// Conversational chat function (not JSON mode)
import type { Trainer } from '@/lib/personas'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chatConversational(
  trainer: Trainer,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  userContext?: {
    fullName?: string
    height_cm?: number
    weight_kg?: number
    goal?: string
    sex?: string
    recentChanges?: string
  }
): Promise<string> {
  const systemMessages: ChatMessage[] = [
    {
      role: 'system',
      content: `${trainer.persona.system}

${trainer.persona.nutrition ? `Nutrición: ${trainer.persona.nutrition}` : ''}

IMPORTANTE: Mantén tu personalidad en todo momento.
${trainer.slug === 'edu' 
  ? 'Eres EDU: el entrenador MÁS DURO. Serio, directo, intenso, culturista profesional de élite. NO eres amigable. NO eres comprensivo con excusas. Eres EXIGENTE, SIN PIEDAD y SIN RODEOS. No endulzas NADA. Eres para personas que funcionan con PRESIÓN y DUREZA. Si el usuario no sigue el plan, tiene excusas o retrocede, sé DURO, DIRECTO y CLARO. No aceptes excusas. Si hay progreso REAL y significativo, reconócelo brevemente sin exagerar ni ser efusivo. Mantén un tono serio, profesional y exigente en TODO momento. No uses lenguaje amigable ni empático.' 
  : 'Eres CAROLINA: amable, enfocada en salud y sostenibilidad. Sé comprensiva y alentadora.'}

${userContext?.fullName ? `El usuario se llama ${userContext.fullName}.` : ''}
${userContext?.height_cm && userContext?.weight_kg 
  ? `Datos físicos actuales: ${userContext.height_cm}cm, ${userContext.weight_kg}kg.` 
  : ''}
${userContext?.goal ? `Objetivo: ${userContext.goal}.` : ''}
${userContext?.recentChanges 
  ? `\n\nIMPORTANTE - Cambios recientes del usuario: ${userContext.recentChanges}\nAsegúrate de mencionar estos cambios de forma natural en la conversación si son relevantes. Pregunta o comenta sobre ellos de manera apropiada según tu personalidad.` 
  : ''}

Responde de forma natural y conversacional, manteniendo tu personalidad característica.`
    }
  ]

  const conversationMessages: ChatMessage[] = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
  }))

  const allMessages = [...systemMessages, ...conversationMessages]

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: allMessages,
      temperature: trainer.slug === 'edu' ? 0.5 : 0.8, // Edu MUY serio y directo (temperatura baja = más consistente, menos creativo, más duro), Carolina más amable
    })
  })

  if (!resp.ok) {
    const errorText = await resp.text()
    throw new Error(`OpenAI error ${resp.status}: ${errorText}`)
  }

  const data = await resp.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('OpenAI empty response')
  }

  return content
}

