/**
 * Verificador de Completitud de Respuestas de Dieta
 * 
 * Este módulo verifica que las respuestas de dieta incluyan todos los bloques
 * obligatorios y completa automáticamente lo que falte.
 */

export type DietResponseBlocks = {
  rules: string[]
  allowed_foods: {
    proteins: string[]
    carbs: string[]
    fats: string[]
    vegetables: string[]
    fruits: string[]
    beverages: string[]
    snacks: string[]
  }
  controlled_foods: Array<{
    name: string
    max_quantity?: string
    frequency?: string
  }>
  prohibited_foods: string[]
  meal_examples: {
    breakfast?: string[]
    lunch?: string[]
    dinner?: string[]
    snacks?: string[]
  }
  weekly_plan?: {
    [day: string]: any
  }
}

export type CompletenessCheck = {
  isComplete: boolean
  missingBlocks: string[]
  missingCategories: string[]
  rulesCount: number
  allowedFoodsTotal: number
  mealExamplesCount: number
  goalSpecificChecks: {
    gain_muscle: {
      has_high_protein: boolean
      has_calorie_surplus: boolean
      has_post_workout_nutrition: boolean
    }
    lose_fat: {
      has_calorie_deficit: boolean
      has_high_protein: boolean
      has_fiber_focus: boolean
    }
    recomposition: {
      has_balanced_macros: boolean
      has_training_day_adaptation: boolean
    }
  }
}

/**
 * Parsea una respuesta de dieta en bloques estructurados
 */
export function parseDietResponse(response: string): Partial<DietResponseBlocks> {
  const blocks: Partial<DietResponseBlocks> = {
    rules: [],
    allowed_foods: {
      proteins: [],
      carbs: [],
      fats: [],
      vegetables: [],
      fruits: [],
      beverages: [],
      snacks: []
    },
    controlled_foods: [],
    prohibited_foods: [],
    meal_examples: {}
  }

  // Extraer reglas (buscar sección "REGLAS" o "Reglas del objetivo")
  const rulesMatch = response.match(/(?:REGLAS|Reglas del objetivo|🎯 REGLAS)[\s\S]*?(?=\n\n|✅|🥩|⚠️|❌|🍽️|📅|$)/i)
  if (rulesMatch) {
    const rulesText = rulesMatch[0]
    const ruleLines = rulesText.split('\n').filter(line => 
      line.trim().match(/^\d+\.|^[-•]/) && line.trim().length > 10
    )
    blocks.rules = ruleLines.map(line => line.replace(/^\d+\.|^[-•]\s*/, '').trim())
  }

  // Extraer alimentos permitidos por categoría
  const categoryPatterns = {
    proteins: /(?:🥩|PROTEÍNAS|Proteínas)[\s\S]*?(?=\n\n|🍚|🥑|🥬|🥤|🍪|⚠️|❌|🍽️|$)/i,
    carbs: /(?:🍚|HIDRATOS|Carbohidratos|Hidratos)[\s\S]*?(?=\n\n|🥑|🥬|🥤|🍪|⚠️|❌|🍽️|$)/i,
    fats: /(?:🥑|GRASAS|Grasas)[\s\S]*?(?=\n\n|🥬|🥤|🍪|⚠️|❌|🍽️|$)/i,
    vegetables: /(?:🥬|VERDURAS|Verduras|Vegetales)[\s\S]*?(?=\n\n|🥤|🍪|⚠️|❌|🍽️|$)/i,
    fruits: /(?:🍎|FRUTAS|Frutas)[\s\S]*?(?=\n\n|🥤|🍪|⚠️|❌|🍽️|$)/i,
    beverages: /(?:🥤|BEBIDAS|Bebidas)[\s\S]*?(?=\n\n|🍪|⚠️|❌|🍽️|$)/i,
    snacks: /(?:🍪|SNACKS|Snacks)[\s\S]*?(?=\n\n|⚠️|❌|🍽️|$)/i
  }

  for (const [category, pattern] of Object.entries(categoryPatterns)) {
    const match = response.match(pattern)
    if (match) {
      const categoryText = match[0]
      const items = categoryText.split('\n')
        .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'))
        .map(line => {
          const cleaned = line.replace(/^[•-]\s*/, '').split('-')[0].trim()
          return cleaned
        })
        .filter(item => item.length > 2)
      
      if (blocks.allowed_foods) {
        blocks.allowed_foods[category as keyof typeof blocks.allowed_foods] = items
      }
    }
  }

  // Extraer alimentos limitados
  const controlledMatch = response.match(/(?:⚠️|ALIMENTOS LIMITADOS|Limitados)[\s\S]*?(?=\n\n|❌|🍽️|📅|$)/i)
  if (controlledMatch) {
    const controlledText = controlledMatch[0]
    const items = controlledText.split('\n')
      .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'))
      .map(line => {
        const cleaned = line.replace(/^[•-]\s*/, '').trim()
        const parts = cleaned.split('-')
        return {
          name: parts[0].trim(),
          max_quantity: parts[1]?.trim(),
          frequency: parts[2]?.trim()
        }
      })
      .filter(item => item.name.length > 2)
    
    blocks.controlled_foods = items
  }

  // Extraer alimentos prohibidos
  const prohibitedMatch = response.match(/(?:❌|PROHIBIDOS|Prohibidos)[\s\S]*?(?=\n\n|🍽️|📅|$)/i)
  if (prohibitedMatch) {
    const prohibitedText = prohibitedMatch[0]
    const items = prohibitedText.split('\n')
      .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'))
      .map(line => line.replace(/^[•-]\s*/, '').split('-')[0].trim())
      .filter(item => item.length > 2)
    
    blocks.prohibited_foods = items
  }

  // Extraer ejemplos de comidas
  const mealExamplesMatch = response.match(/(?:🍽️|EJEMPLO|Ejemplo de día)[\s\S]*?(?=\n\n|📊|📅|💡|⚠️|$)/i)
  if (mealExamplesMatch) {
    blocks.meal_examples = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: []
    }
    
    const examplesText = mealExamplesMatch[0]
    const breakfastMatch = examplesText.match(/(?:🌅|DESAYUNO|Desayuno)[\s\S]*?(?=\n\n|🍽️|🌙|$)/i)
    const lunchMatch = examplesText.match(/(?:🍽️|COMIDA|Comida)[\s\S]*?(?=\n\n|🌙|🍎|$)/i)
    const dinnerMatch = examplesText.match(/(?:🌙|CENA|Cena)[\s\S]*?(?=\n\n|🍎|📊|$)/i)
    const snacksMatch = examplesText.match(/(?:🍎|SNACKS|Snacks)[\s\S]*?(?=\n\n|📊|$)/i)
    
    if (breakfastMatch) blocks.meal_examples.breakfast = [breakfastMatch[0]]
    if (lunchMatch) blocks.meal_examples.lunch = [lunchMatch[0]]
    if (dinnerMatch) blocks.meal_examples.dinner = [dinnerMatch[0]]
    if (snacksMatch) blocks.meal_examples.snacks = [snacksMatch[0]]
  }

  return blocks
}

/**
 * Ejecuta checklist de completitud
 */
export function runCompletenessCheck(
  parsed: Partial<DietResponseBlocks>,
  userGoal: string
): CompletenessCheck {
  
  const missingBlocks: string[] = []
  const missingCategories: string[] = []
  
  // Verificar bloques obligatorios
  if (!parsed.rules || parsed.rules.length < 5) {
    missingBlocks.push('rules')
  }
  
  if (!parsed.allowed_foods) {
    missingBlocks.push('allowed_foods')
  } else {
    const categories = ['proteins', 'carbs', 'fats', 'vegetables', 'fruits', 'beverages', 'snacks']
    for (const category of categories) {
      const items = parsed.allowed_foods[category as keyof typeof parsed.allowed_foods]
      if (!items || items.length < 3) {
        missingCategories.push(category)
      }
    }
  }
  
  if (!parsed.controlled_foods || parsed.controlled_foods.length === 0) {
    missingBlocks.push('controlled_foods')
  }
  
  if (!parsed.prohibited_foods || parsed.prohibited_foods.length === 0) {
    missingBlocks.push('prohibited_foods')
  }
  
  if (!parsed.meal_examples || 
      !parsed.meal_examples.breakfast || 
      !parsed.meal_examples.lunch || 
      !parsed.meal_examples.dinner) {
    missingBlocks.push('meal_examples')
  }
  
  // Verificaciones específicas por objetivo
  const goalLower = userGoal.toLowerCase()
  const goalSpecificChecks = {
    gain_muscle: {
      has_high_protein: false,
      has_calorie_surplus: false,
      has_post_workout_nutrition: false
    },
    lose_fat: {
      has_calorie_deficit: false,
      has_high_protein: false,
      has_fiber_focus: false
    },
    recomposition: {
      has_balanced_macros: false,
      has_training_day_adaptation: false
    }
  }
  
  // Analizar contenido para checks específicos (simplificado)
  const responseText = JSON.stringify(parsed).toLowerCase()
  
  if (goalLower.includes('ganar') || goalLower.includes('músculo')) {
    goalSpecificChecks.gain_muscle.has_high_protein = 
      responseText.includes('2g') || responseText.includes('proteína alta')
    goalSpecificChecks.gain_muscle.has_calorie_surplus = 
      responseText.includes('superávit') || responseText.includes('exceso')
  }
  
  if (goalLower.includes('perder') || goalLower.includes('grasa')) {
    goalSpecificChecks.lose_fat.has_calorie_deficit = 
      responseText.includes('déficit') || responseText.includes('reducir')
    goalSpecificChecks.lose_fat.has_fiber_focus = 
      responseText.includes('verdura') || responseText.includes('fibra')
  }
  
  return {
    isComplete: missingBlocks.length === 0 && missingCategories.length === 0,
    missingBlocks,
    missingCategories,
    rulesCount: parsed.rules?.length || 0,
    allowedFoodsTotal: Object.values(parsed.allowed_foods || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0),
    mealExamplesCount: Object.keys(parsed.meal_examples || {}).length,
    goalSpecificChecks
  }
}

/**
 * Identifica qué items faltan específicamente
 */
export function identifyMissingItems(check: CompletenessCheck): string[] {
  const missing: string[] = []
  
  if (check.missingBlocks.includes('rules')) {
    missing.push('Necesito añadir más reglas del objetivo (mínimo 5-10 puntos)')
  }
  
  if (check.missingBlocks.includes('allowed_foods')) {
    missing.push('Faltan alimentos permitidos por categorías')
  }
  
  check.missingCategories.forEach(category => {
    const categoryNames: Record<string, string> = {
      proteins: 'proteínas',
      carbs: 'hidratos de carbono',
      fats: 'grasas',
      vegetables: 'verduras',
      fruits: 'frutas',
      beverages: 'bebidas',
      snacks: 'snacks'
    }
    missing.push(`Faltan opciones de ${categoryNames[category] || category} (mínimo 3-5)`)
  })
  
  if (check.missingBlocks.includes('controlled_foods')) {
    missing.push('Faltan alimentos limitados con cantidades')
  }
  
  if (check.missingBlocks.includes('prohibited_foods')) {
    missing.push('Faltan alimentos prohibidos o a evitar')
  }
  
  if (check.missingBlocks.includes('meal_examples')) {
    missing.push('Faltan ejemplos completos de comidas (desayuno, comida, cena)')
  }
  
  return missing
}

/**
 * Genera contenido faltante basado en el material del entrenador
 */
export async function generateMissingContent(
  missingItems: string[],
  trainerMaterial: any[], // Array de TrainerContent
  userGoal: string,
  existingContent: Partial<DietResponseBlocks>
): Promise<string> {
  
  // Construir prompt para completar lo que falta
  const missingText = missingItems.join(', ')
  
  const prompt = `El usuario pidió un plan de dieta pero mi respuesta inicial no estaba completa. 
Faltan estos elementos: ${missingText}

Basándome SOLO en el material del entrenador que tengo disponible, completa SOLO lo que falta.
NO inventes nada que no esté en el material.

Material disponible:
${trainerMaterial.map(m => `- ${m.structured_data.title}: ${m.raw_content.substring(0, 500)}`).join('\n')}

Objetivo del usuario: ${userGoal}

Contenido que ya incluí (NO lo repitas):
${JSON.stringify(existingContent, null, 2).substring(0, 1000)}

Genera SOLO el contenido faltante en el mismo formato, sin repetir lo que ya dije.`

  // Esto se integrará con OpenAI para generar el complemento
  // Por ahora retornamos un placeholder
  return `\n\n[Contenido faltante que se completará con OpenAI basado en el material del entrenador]`
}

/**
 * Verifica y completa respuesta de dieta (función principal)
 */
export async function verifyAndCompleteDietResponse(
  initialResponse: string,
  userGoal: string,
  trainerMaterial: any[],
  maxIterations: number = 3
): Promise<{
  isComplete: boolean
  completedResponse: string
  missingItems: string[]
  iterations: number
}> {
  
  let response = initialResponse
  let iterations = 0
  const allMissingItems: string[] = []
  const addedContent: string[] = [] // Para evitar repeticiones
  
  while (iterations < maxIterations) {
    // 1. Parsear respuesta actual
    const parsed = parseDietResponse(response)
    
    // 2. Ejecutar checklist
    const check = runCompletenessCheck(parsed, userGoal)
    
    // 3. Si está completo, salir
    if (check.isComplete) {
      return {
        isComplete: true,
        completedResponse: response,
        missingItems: [],
        iterations
      }
    }
    
    // 4. Identificar qué falta
    const missing = identifyMissingItems(check)
    allMissingItems.push(...missing)
    
    // 5. Generar complemento (esto se integrará con OpenAI)
    const complement = await generateMissingContent(
      missing,
      trainerMaterial,
      userGoal,
      parsed
    )
    
    // 6. Verificar que no sea muy similar a contenido ya añadido
    const isSimilar = addedContent.some(added => {
      // Simple check de similitud (mejorar con embeddings)
      const similarity = calculateSimpleSimilarity(complement, added)
      return similarity > 0.8
    })
    
    if (!isSimilar && complement.trim().length > 50) {
      // 7. Añadir complemento a respuesta
      response = response + "\n\n" + complement
      addedContent.push(complement)
    } else {
      // Si es muy similar, parar para evitar bucle
      break
    }
    
    iterations++
  }
  
  // Si llegamos aquí, no se completó en maxIterations
  const finalCheck = runCompletenessCheck(parseDietResponse(response), userGoal)
  
  return {
    isComplete: finalCheck.isComplete,
    completedResponse: response + (finalCheck.isComplete ? '' : 
      "\n\n⚠️ Nota: Algunos detalles pueden no estar completos en mi material. " +
      "Usa esto como guía base y ajusta según tus necesidades."),
    missingItems: allMissingItems.slice(-5), // Últimos 5 items
    iterations
  }
}

/**
 * Calcula similitud simple entre dos textos (0-1)
 */
function calculateSimpleSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/))
  const words2 = new Set(text2.toLowerCase().split(/\s+/))
  
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  
  return intersection.size / union.size
}

