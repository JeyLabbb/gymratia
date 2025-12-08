import type { StoredPlanProfile, StoredPlanAvailability } from '@/lib/plan-storage'

type UserContext = {
  profile?: StoredPlanProfile
  availability?: StoredPlanAvailability
  intensity?: number | null
}

export async function chatJSON(
  system: string,
  user: string,
  userContext?: UserContext
) {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: system }
  ]

  // Add user context if provided
  if (userContext) {
    const contextLines: string[] = []

    if (userContext.profile) {
      const p = userContext.profile
      contextLines.push('Datos del usuario:')
      if (p.fullName) contextLines.push(`- Nombre: ${p.fullName}`)
      if (p.sex) contextLines.push(`- Sexo: ${p.sex}`)
      if (p.height_cm) contextLines.push(`- Altura: ${p.height_cm} cm`)
      if (p.weight_kg) contextLines.push(`- Peso: ${p.weight_kg} kg`)
      if (p.goal) contextLines.push(`- Objetivo declarado: ${p.goal}`)
      if (p.notes) contextLines.push(`- Comentarios subjetivos: ${p.notes}`)
    }

    if (userContext.availability) {
      const a = userContext.availability
      contextLines.push('Disponibilidad:')
      if (a.daysPerWeek) contextLines.push(`- Días/semana: ${a.daysPerWeek}`)
      if (a.cannotTrain?.length)
        contextLines.push(`- No puede entrenar estos días: ${a.cannotTrain.join(', ')}`)
    }

    if (typeof userContext.intensity === 'number') {
      contextLines.push(`Intensidad deseada (1-10): ${userContext.intensity}`)
    }

    const contextText =
      contextLines.length > 0
        ? contextLines.join('\n')
        : 'No se han proporcionado datos adicionales del usuario.'

    messages.push({
      role: 'user',
      content:
        'Ten en cuenta el siguiente contexto real del usuario a la hora de diseñar el plan de 9 semanas:\n\n' +
        contextText +
        '\n\nAdapta volumen, selección de ejercicios, progresión y tono de recomendaciones a este perfil.'
    })
  }

  // Add the main user instruction
  messages.push({ role: 'user', content: user })

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages
    })
  })
  if (!resp.ok) throw new Error(`OpenAI error ${resp.status} ${await resp.text()}`)
  const data = await resp.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI empty response')
  return JSON.parse(content)
}