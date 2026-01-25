# Sistema RAG para Entrenadores IA - Especificación Completa

## 1. FLUJO RAG: QUÉ ENTRA, QUÉ BUSCA, QUÉ DEVUELVE

### 📥 INPUT (Qué entra al sistema)

#### Contexto del Usuario:
```typescript
{
  userId: string
  trainerSlug: 'jey'
  userProfile: {
    weight_kg: number
    height_cm: number
    goal: string // 'ganar músculo', 'perder grasa', 'recomposición', etc.
    sex: string
    preferred_name: string
  }
  recentProgress: {
    weightHistory: Array<{date: string, weight_kg: number}>
    lastWeight: number
    trend: 'up' | 'down' | 'stable'
  }
  preferences: {
    mealTimes?: {breakfast: string, lunch: string, dinner: string}
    cannotTrainDays?: string[]
    intensity?: number
  }
  currentWorkout?: {
    title: string
    workout_data: any
  }
  currentDiet?: {
    title: string
    diet_data: any
  }
}
```

#### Query del Usuario:
```
Ejemplos:
- "¿Qué entrenamiento me toca hoy?"
- "Dame un plan de dieta para ganar músculo"
- "¿Qué puedo comer para cenar?"
- "Necesito un entrenamiento de piernas"
```

### 🔍 BÚSQUEDA (Qué busca en la biblioteca)

#### Paso 1: Análisis de Intención
```typescript
IntentTypes = 
  | 'workout_request'      // Pide entrenamiento
  | 'diet_request'         // Pide dieta/plan nutricional
  | 'meal_plan_request'    // Pide plan de comidas específico
  | 'food_question'        // Pregunta sobre alimentos
  | 'exercise_question'   // Pregunta sobre ejercicios
  | 'progress_question'   // Pregunta sobre progreso
  | 'general_chat'        // Conversación general
```

#### Paso 2: Búsqueda Semántica en Biblioteca
```typescript
// Para cada tipo de contenido relevante:

1. WORKOUTS:
   - Buscar en trainer_workouts donde trainer_id = jey.id
   - Filtros:
     * goal_match: workout_data.tags.includes(user.goal)
     * intensity_match: workout_data.intensity <= user.intensity
     * days_match: workout_data.days.length <= user.availableDays
   - Ordenar por: relevancia semántica + match_score

2. DIETS:
   - Buscar en trainer_diets donde trainer_id = jey.id
   - Filtros:
     * goal_match: diet_data.target_goals.includes(user.goal)
     * macros_match: diet_data.calories aprox user.needs
   - Ordenar por: relevancia semántica + match_score

3. CONTENT_CHUNKS (si hay documentos/PDFs):
   - Buscar en trainer_content_chunks
   - Embedding similarity search
   - Top 5-10 chunks más relevantes
```

#### Paso 3: Relevancia y Ranking
```typescript
RelevanceScore = {
  semantic_match: number,    // 0-1, embedding similarity
  goal_match: number,        // 0-1, objetivo coincide
  context_match: number,     // 0-1, contexto del usuario
  recency: number,           // 0-1, contenido más reciente
  usage_count: number        // 0-1, usado más veces
}

FinalScore = (
  semantic_match * 0.4 +
  goal_match * 0.3 +
  context_match * 0.2 +
  recency * 0.05 +
  usage_count * 0.05
)
```

### 📤 OUTPUT (Qué devuelve)

#### Estructura de Respuesta:
```typescript
{
  response: string,              // Respuesta natural del chat
  sources: Array<{               // Fuentes usadas (para citas implícitas)
    type: 'workout' | 'diet' | 'content_chunk',
    id: string,
    title: string,
    excerpt: string,              // Fragmento usado
    relevance_score: number
  }>,
  structured_data?: {            // Si es entrenamiento o dieta
    type: 'workout' | 'diet',
    data: WorkoutData | DietData
  },
  missing_info?: Array<string>,   // Info que falta en el material
  safety_warnings?: Array<string> // Advertencias de seguridad
}
```

---

## 2. ESTRUCTURA DE PLANTILLAS (Campos Exactos)

### 🏋️ PLANTILLA: ENTRENAMIENTO

```typescript
type TrainerWorkoutTemplate = {
  // Metadata
  id: string
  trainer_id: string
  title: string
  description?: string
  
  // Clasificación
  target_goals: string[]        // ['ganar_musculo', 'fuerza', 'hipertrofia']
  intensity_level: number       // 1-10
  experience_level: string      // 'principiante' | 'intermedio' | 'avanzado'
  duration_weeks?: number        // Duración del programa
  
  // Estructura del entrenamiento
  workout_data: {
    days: Array<{
      day: string                // 'Lunes', 'Martes', etc.
      day_number?: number        // 1-7
      focus?: string             // 'Push', 'Pull', 'Legs', etc.
      exercises: Array<{
        // Identificación
        name: string             // 'Press banca barra'
        exercise_id?: string     // ID de ejercicio estándar (opcional)
        
        // Volumen e intensidad
        sets: number             // 4
        reps: string             // '6-8' o '8-12' o 'AMRAP'
        target_rir?: number      // 0-3 (Reps in Reserve)
        
        // Técnica
        tempo?: string           // '2-1-1-0' (excéntrico-pausa-concéntrico-pausa)
        rest_seconds: number     // 150
        
        // Clasificación
        muscle_groups: string[]  // ['Pecho', 'Tríceps']
        equipment?: string[]     // ['Barra', 'Banco']
        movement_pattern?: string // 'empuje_horizontal'
        
        // Progresión
        progression_notes?: string // 'Si sacas 8 fácil, sube peso'
        drop_set?: boolean        // Si aplica dropset
        rest_pause?: boolean      // Si aplica rest-pause
        
        // Notas
        technique_notes?: string  // 'Espalda pegada al banco'
        common_mistakes?: string[] // ['Arquear espalda', 'Rebotes']
        alternatives?: string[]   // Ejercicios alternativos
      }>
      
      // Metadatos del día
      estimated_duration?: number // minutos
      total_volume?: string       // 'Alto', 'Medio', 'Bajo'
      notes?: string              // Notas generales del día
    }>
    
    // Progresión general
    progression_scheme?: {
      type: 'linear' | 'double_progression' | 'periodized'
      notes: string
    }
    
    // Notas generales
    general_notes?: string
    warmup_recommendations?: string
    cooldown_recommendations?: string
  }
  
  // Versionado
  version: number
  created_at: timestamp
  updated_at: timestamp
  is_template: boolean
}
```

### 🥗 PLANTILLA: DIETA

```typescript
type TrainerDietTemplate = {
  // Metadata
  id: string
  trainer_id: string
  title: string
  description?: string
  
  // Clasificación
  target_goals: string[]        // ['ganar_musculo', 'perder_grasa', 'recomposición']
  calorie_range?: {
    min: number
    max: number
  }
  
  // Macros objetivo
  daily_calories: number
  daily_protein_g: number
  daily_carbs_g: number
  daily_fats_g: number
  
  // Estructura de la dieta
  diet_data: {
    // Reglas generales
    rules: Array<{
      title: string              // 'Timing de comidas'
      content: string            // 'Come proteína en cada comida...'
      priority: number           // 1-5, importancia
    }>
    
    // Alimentos por categorías
    allowed_foods: {
      proteins: Array<{
        name: string
        notes?: string           // 'Preferir pechuga sin piel'
        preparation?: string[]   // ['a la plancha', 'horno']
      }>
      carbs: Array<{
        name: string
        notes?: string
        preferred_timing?: string // 'pre_entreno', 'post_entreno'
      }>
      fats: Array<{
        name: string
        notes?: string
      }>
      vegetables: Array<{
        name: string
        notes?: string
        unlimited?: boolean      // Verduras de hoja verde
      }>
      fruits: Array<{
        name: string
        notes?: string
        portion_size?: string    // '1 pieza', '100g'
      }>
      beverages: Array<{
        name: string
        notes?: string
        unlimited?: boolean      // Agua, té sin azúcar
      }>
      snacks: Array<{
        name: string
        calories?: number
        notes?: string
      }>
    }
    
    // Alimentos limitados
    controlled_foods: Array<{
      name: string
      max_quantity: string      // '100g', '1 porción'
      frequency: string          // '2x semana', 'diario'
      timing?: string            // 'solo post-entreno'
      notes?: string
    }>
    
    // Alimentos prohibidos
    prohibited_foods: Array<{
      name: string
      reason?: string            // 'Alto en azúcares refinados'
      alternatives?: string[]    // Alternativas permitidas
    }>
    
    // Ejemplos
    meal_examples: {
      breakfast: Array<{
        name: string             // 'Desayuno proteico'
        foods: Array<{
          name: string
          quantity: string
          calories?: number
        }>
        total_calories?: number
        macros?: {
          protein: number
          carbs: number
          fats: number
        }
      }>
      lunch: Array<{...}>
      dinner: Array<{...}>
      snacks: Array<{...}>
    }
    
    // Plan semanal (opcional)
    weekly_plan?: {
      monday: {
        breakfast: {...}
        lunch: {...}
        dinner: {...}
        snacks: {...}
      }
      // ... resto de días
    }
    
    // Adaptaciones
    adaptations: {
      training_days: {
        carb_increase: number    // +20% carbohidratos
        calorie_increase: number // +200 kcal
        notes: string
      }
      rest_days: {
        carb_reduction: number   // -30% carbohidratos
        calorie_reduction: number // -300 kcal
        notes: string
      }
    }
    
    // Suplementación (opcional)
    supplements?: Array<{
      name: string
      dosage: string
      timing: string
      notes?: string
    }>
  }
  
  // Versionado
  version: number
  created_at: timestamp
  updated_at: timestamp
  is_template: boolean
}
```

---

## 3. VERIFICADOR DE DIETA (Checklist y Anti-Bucle)

### ✅ CHECKLIST DE COMPLETITUD

```typescript
type DietCompletenessCheck = {
  // Bloques obligatorios
  has_rules: boolean                    // Mínimo 5-10 reglas
  has_allowed_foods: boolean            // Todas las categorías
  has_controlled_foods: boolean
  has_prohibited_foods: boolean
  has_meal_examples: boolean            // Al menos desayuno, comida, cena
  has_weekly_plan?: boolean             // Si se solicitó
  
  // Categorías de alimentos
  categories_complete: {
    proteins: boolean                   // Mínimo 5-8 opciones
    carbs: boolean                      // Mínimo 5-8 opciones
    fats: boolean                       // Mínimo 3-5 opciones
    vegetables: boolean                 // Mínimo 5-10 opciones
    fruits: boolean                     // Mínimo 3-5 opciones
    beverages: boolean                  // Mínimo 3-5 opciones
    snacks: boolean                     // Mínimo 2-3 opciones
  }
  
  // Calidad
  rules_count: number                   // Debe ser >= 5
  allowed_foods_total: number           // Debe ser >= 20
  meal_examples_count: number           // Debe ser >= 3 (desayuno, comida, cena)
  
  // Específico por objetivo
  goal_specific_checks: {
    gain_muscle: {
      has_high_protein: boolean         // >= 2g/kg
      has_calorie_surplus: boolean       // Mención de superávit
      has_post_workout_nutrition: boolean
    }
    lose_fat: {
      has_calorie_deficit: boolean      // Mención de déficit
      has_high_protein: boolean         // >= 1.6g/kg
      has_fiber_focus: boolean          // Verduras ilimitadas
    }
    recomposition: {
      has_balanced_macros: boolean
      has_training_day_adaptation: boolean
    }
  }
}
```

### 🔄 FLUJO DEL VERIFICADOR

```typescript
async function verifyAndCompleteDietResponse(
  initialResponse: string,
  userGoal: string,
  trainerMaterial: DietMaterial
): Promise<{
  isComplete: boolean
  completedResponse: string
  missingItems: string[]
  iterations: number
}> {
  
  let response = initialResponse
  let iterations = 0
  const maxIterations = 3
  const missingItems: string[] = []
  
  while (iterations < maxIterations) {
    // 1. Parsear respuesta actual
    const parsed = parseDietResponse(response)
    
    // 2. Ejecutar checklist
    const check = runCompletenessCheck(parsed, userGoal)
    
    // 3. Si está completo, salir
    if (check.isComplete) {
      return { isComplete: true, completedResponse: response, missingItems: [], iterations }
    }
    
    // 4. Identificar qué falta
    const missing = identifyMissingItems(check)
    missingItems.push(...missing)
    
    // 5. Generar complemento
    const complement = await generateMissingContent(
      missing,
      trainerMaterial,
      userGoal,
      parsed // Para no repetir lo que ya hay
    )
    
    // 6. Añadir complemento a respuesta
    response = response + "\n\n" + complement
    
    iterations++
  }
  
  // Si llegamos aquí, no se completó en maxIterations
  return {
    isComplete: false,
    completedResponse: response,
    missingItems: missingItems.slice(-5), // Últimos 5 items faltantes
    iterations
  }
}
```

### 🛡️ REGLAS ANTI-BUCLE

```typescript
const ANTI_LOOP_RULES = {
  // 1. Máximo de iteraciones
  maxIterations: 3,
  
  // 2. No repetir contenido
  noRepeat: {
    checkSimilarity: true,
    similarityThreshold: 0.8,  // Si >80% similar, no añadir
    trackAddedContent: []       // Guardar lo ya añadido
  },
  
  // 3. Límite de tokens por iteración
  maxTokensPerIteration: 500,
  
  // 4. Timeout
  maxTimeSeconds: 30,
  
  // 5. Si falta info crítica del material, parar
  stopIfMissingCritical: [
    'no_allowed_foods_in_material',
    'no_diet_rules_in_material',
    'material_too_vague'
  ],
  
  // 6. Fallback: Si no se completa, usar lo que hay + disclaimer
  fallbackMessage: "Nota: Algunos detalles pueden no estar completos en mi material. " +
                   "Usa esto como guía base y ajusta según tus necesidades."
}
```

---

## 4. FORMATO FINAL DE RESPUESTA (Plantillas de Salida)

### 🏋️ PLANTILLA: RESPUESTA DE ENTRENAMIENTO

```
[Nombre del Entrenamiento]
[Descripción breve: para qué objetivo, duración estimada]

📅 DÍA: [Nombre del día]
⏱️ Duración estimada: [X] minutos

Ejercicios:

1. [Nombre del ejercicio]
   • Series: [X]
   • Repeticiones: [objetivo]
   • Tempo: [X-X-X-X] (si está en material, si no: "No especificado en mi material")
   • Descanso: [X] segundos
   • Grupos musculares: [lista]
   • Notas técnicas: [notas del material o "No especificado"]
   • Progresión: [si está en material]

2. [Siguiente ejercicio...]

[... resto de ejercicios ...]

📝 Notas generales:
[Notas del día si están en material]

⚠️ Si falta información (tempo, progresión, etc.):
"Nota: [X] no está especificado en mi material. Te recomiendo consultar con un entrenador presencial para estos detalles."
```

### 🥗 PLANTILLA: RESPUESTA DE DIETA (BLOQUES OBLIGATORIOS)

```
📋 PLAN DE DIETA - [Objetivo del usuario]

🎯 REGLAS DEL OBJETIVO (5-10 puntos):
1. [Regla 1 del material]
2. [Regla 2 del material]
...
[Si faltan reglas: "Algunas reglas específicas no están en mi material. Te recomiendo..."]

✅ ALIMENTOS PERMITIDOS:

🥩 PROTEÍNAS:
• [Alimento 1] - [notas si hay]
• [Alimento 2]
...
[Si faltan: "Mi material no especifica todas las opciones de proteínas. Las básicas son: pollo, pescado, huevos..."]

🍚 HIDRATOS DE CARBONO:
• [Alimento 1]
• [Alimento 2]
...

🥑 GRASAS:
• [Alimento 1]
• [Alimento 2]
...

🥬 VERDURAS Y FRUTAS:
• [Alimento 1] - [ilimitado/si aplica]
• [Alimento 2]
...

🥤 BEBIDAS:
• [Bebida 1] - [ilimitado/si aplica]
• [Bebida 2]
...

🍪 SNACKS:
• [Snack 1] - [calorías si hay]
• [Snack 2]
...

⚠️ ALIMENTOS LIMITADOS:
• [Alimento 1] - Máximo: [cantidad] - Frecuencia: [X veces/semana]
• [Alimento 2] - [detalles]
...
[Si faltan: "No tengo información específica sobre alimentos limitados en mi material"]

❌ ALIMENTOS PROHIBIDOS / A EVITAR:
• [Alimento 1] - [razón si hay]
• [Alimento 2]
...
[Si faltan: "Basándome en tu objetivo, evita: azúcares refinados, procesados..."]

🍽️ EJEMPLO DE DÍA:

🌅 DESAYUNO:
[Alimento 1] - [cantidad]
[Alimento 2] - [cantidad]
Total: ~[X] kcal | P: [X]g C: [X]g G: [X]g

🍽️ COMIDA:
[Alimento 1] - [cantidad]
[Alimento 2] - [cantidad]
Total: ~[X] kcal | P: [X]g C: [X]g G: [X]g

🌙 CENA:
[Alimento 1] - [cantidad]
[Alimento 2] - [cantidad]
Total: ~[X] kcal | P: [X]g C: [X]g G: [X]g

🍎 SNACKS (opcional):
[Snack 1] - [cantidad]

📊 TOTAL DIARIO: ~[X] kcal | P: [X]g C: [X]g G: [X]g

📅 PLAN SEMANAL (si se solicitó):
[Lunes/Martes/etc. con comidas del día]

💡 ADAPTACIONES:
• Días de ENTRENAMIENTO: [aumento de carbos/calorías si está en material]
• Días de DESCANSO: [reducción si está en material]

⚠️ NOTA IMPORTANTE:
Si falta información específica en mi material, te indico qué no tengo cubierto. 
No invento recomendaciones fuera de lo que Jey ha compartido conmigo.
```

---

## 5. REGLAS DE SEGURIDAD + DISCLAIMERS INTEGRADOS

### 🚨 DETECCIÓN DE SITUACIONES SENSIBLES

```typescript
const SENSITIVE_KEYWORDS = {
  medical_conditions: [
    'diabetes', 'hipertensión', 'hipertenso', 'cardiopatía',
    'lesión', 'lesionado', 'dolor', 'dolores', 'artritis',
    'osteoporosis', 'hernia', 'problema de espalda', 'rodilla',
    'hombro lesionado', 'codo', 'muñeca'
  ],
  
  eating_disorders: [
    'anorexia', 'bulimia', 'trastorno alimentario',
    'no como', 'no como nada', 'vomito', 'purgas',
    'obsesión con la comida', 'miedo a engordar'
  ],
  
  mental_health: [
    'depresión', 'ansiedad', 'estrés', 'no puedo más',
    'quiero dejar', 'no tengo motivación', 'me siento mal'
  ],
  
  extreme_behaviors: [
    'entreno 7 días', 'no descanso', 'entreno hasta caer',
    'como muy poco', 'hago mucho cardio', 'ayuno prolongado'
  ]
}
```

### 🛡️ RESPUESTA DE SEGURIDAD

```typescript
function generateSafetyResponse(
  detectedIssues: string[],
  userMessage: string
): string {
  
  const baseMessage = `⚠️ AVISO IMPORTANTE

Lo que mencionas requiere atención de un profesional sanitario. 
Esta aplicación NO sustituye el asesoramiento médico, nutricional 
o de un entrenador personal certificado.

Te recomiendo:
• Consultar con un médico si mencionas condiciones de salud
• Consultar con un nutricionista si hay problemas alimentarios
• Consultar con un fisioterapeuta si hay lesiones o dolores

Puedo ayudarte con:
• Consejos generales de seguridad
• Modificaciones básicas del entrenamiento (si no hay lesión activa)
• Información general sobre nutrición

Pero NO puedo:
• Diagnosticar condiciones
• Prescribir tratamientos
• Sustituir atención profesional`

  // Personalizar según el tipo de detección
  if (detectedIssues.includes('medical_condition')) {
    return baseMessage + "\n\nPor favor, consulta con un médico antes de continuar con cualquier plan de entrenamiento o dieta."
  }
  
  if (detectedIssues.includes('eating_disorder')) {
    return baseMessage + "\n\nSi estás lidiando con un trastorno alimentario, es crucial que busques ayuda profesional. Puedo proporcionar información general, pero no puedo sustituir el tratamiento especializado."
  }
  
  if (detectedIssues.includes('injury')) {
    return baseMessage + "\n\nCon una lesión activa, es esencial que un fisioterapeuta o médico te dé el alta antes de entrenar. Puedo ayudarte a adaptar ejercicios una vez que tengas el visto bueno profesional."
  }
  
  return baseMessage
}
```

### 📝 DISCLAIMER EN CADA RESPUESTA DE DIETA/ENTRENAMIENTO

```
[Al final de cada respuesta de dieta o entrenamiento]

---
⚠️ Recordatorio: Este plan está basado en la información que compartiste 
y el material de Jey. No sustituye el asesoramiento profesional. Si tienes 
condiciones médicas, lesiones o dudas, consulta con un profesional de la salud.
```

---

## 6. REQUISITOS TÉCNICOS DE DATOS

### 📚 BIBLIOTECA DEL ENTRENADOR

#### Tabla: `trainer_content_library`
```sql
CREATE TABLE trainer_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id),
  
  -- Tipo de contenido
  content_type TEXT NOT NULL CHECK (content_type IN (
    'workout', 
    'diet', 
    'document', 
    'video_transcript',
    'pdf_text'
  )),
  
  -- Referencia al contenido original (si viene de otra tabla)
  source_id UUID, -- FK a trainer_workouts.id o trainer_diets.id
  
  -- Contenido procesado para RAG
  raw_content TEXT,           -- Texto completo
  structured_data JSONB,      -- Datos estructurados (workout_data, diet_data)
  
  -- Embeddings para búsqueda semántica
  embedding VECTOR(1536),     -- OpenAI embedding (si usas OpenAI)
  
  -- Metadata para filtrado
  tags TEXT[],                -- ['ganar_musculo', 'fuerza', 'principiante']
  target_goals TEXT[],        -- Objetivos para los que aplica
  intensity_level INTEGER,    -- 1-10
  experience_level TEXT,      -- 'principiante' | 'intermedio' | 'avanzado'
  
  -- Chunking (si el contenido es largo)
  chunk_index INTEGER,        -- Si el contenido está dividido en chunks
  total_chunks INTEGER,       -- Total de chunks de este contenido
  
  -- Versionado
  version INTEGER DEFAULT 1,
  parent_version_id UUID,     -- Si es actualización de otro contenido
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Índices para búsqueda rápida
CREATE INDEX idx_trainer_content_library_trainer ON trainer_content_library(trainer_id);
CREATE INDEX idx_trainer_content_library_type ON trainer_content_library(content_type);
CREATE INDEX idx_trainer_content_library_tags ON trainer_content_library USING GIN(tags);
CREATE INDEX idx_trainer_content_library_goals ON trainer_content_library USING GIN(target_goals);

-- Índice para búsqueda por embedding (si usas pgvector)
CREATE INDEX idx_trainer_content_library_embedding ON trainer_content_library 
  USING ivfflat (embedding vector_cosine_ops);
```

### 🔍 INDEXACIÓN Y BÚSQUEDA

#### Proceso de Indexación:
```typescript
async function indexTrainerContent(
  trainerId: string,
  content: WorkoutData | DietData,
  contentType: 'workout' | 'diet'
) {
  
  // 1. Extraer texto plano para embedding
  const textContent = extractTextFromContent(content)
  
  // 2. Generar embedding
  const embedding = await generateEmbedding(textContent) // OpenAI text-embedding-3-small
  
  // 3. Extraer metadata
  const metadata = extractMetadata(content, contentType)
  
  // 4. Chunking (si es necesario, para contenido largo)
  const chunks = chunkContent(textContent, maxChunkSize: 1000)
  
  // 5. Guardar en biblioteca
  for (const [index, chunk] of chunks.entries()) {
    await supabase.from('trainer_content_library').insert({
      trainer_id: trainerId,
      content_type: contentType,
      source_id: content.id,
      raw_content: chunk,
      structured_data: content,
      embedding: embedding, // Para el chunk principal
      tags: metadata.tags,
      target_goals: metadata.target_goals,
      intensity_level: metadata.intensity,
      experience_level: metadata.experience,
      chunk_index: index,
      total_chunks: chunks.length
    })
  }
}
```

#### Búsqueda Semántica:
```typescript
async function searchTrainerLibrary(
  trainerId: string,
  query: string,
  filters: {
    contentType?: 'workout' | 'diet' | 'all',
    targetGoal?: string,
    intensity?: number,
    limit?: number
  }
) {
  
  // 1. Generar embedding de la query
  const queryEmbedding = await generateEmbedding(query)
  
  // 2. Búsqueda por similitud coseno
  const { data } = await supabase.rpc('match_content', {
    query_embedding: queryEmbedding,
    match_trainer_id: trainerId,
    match_content_type: filters.contentType || 'all',
    match_threshold: 0.7,  // Similarity threshold
    match_count: filters.limit || 10
  })
  
  // 3. Filtrar por metadata adicional
  const filtered = data.filter(item => {
    if (filters.targetGoal && !item.target_goals.includes(filters.targetGoal)) {
      return false
    }
    if (filters.intensity && item.intensity_level > filters.intensity) {
      return false
    }
    return true
  })
  
  // 4. Ordenar por relevancia
  return filtered.sort((a, b) => b.similarity - a.similarity)
}
```

### 📝 VERSIONADO

```typescript
// Cuando el entrenador actualiza contenido:

async function updateTrainerContent(
  contentId: string,
  newContent: WorkoutData | DietData
) {
  
  // 1. Marcar versión anterior como inactiva
  await supabase
    .from('trainer_content_library')
    .update({ is_active: false })
    .eq('source_id', contentId)
  
  // 2. Obtener versión anterior
  const { data: oldVersion } = await supabase
    .from('trainer_content_library')
    .select('version')
    .eq('source_id', contentId)
    .order('version', { ascending: false })
    .limit(1)
    .single()
  
  // 3. Indexar nueva versión
  await indexTrainerContent(
    trainerId,
    { ...newContent, id: contentId },
    contentType
  )
  
  // 4. Actualizar version number
  const newVersion = (oldVersion?.version || 0) + 1
  await supabase
    .from('trainer_content_library')
    .update({ version: newVersion, parent_version_id: oldVersion?.id })
    .eq('source_id', contentId)
    .eq('is_active', true)
}
```

### 📊 LOGS DE USO

```sql
CREATE TABLE trainer_content_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id),
  user_id UUID NOT NULL REFERENCES users(id),
  content_id UUID NOT NULL, -- FK a trainer_content_library.id
  content_type TEXT NOT NULL,
  
  -- Contexto de uso
  query TEXT,                -- Qué preguntó el usuario
  response_type TEXT,        -- 'workout' | 'diet' | 'general'
  was_helpful BOOLEAN,       -- Si el usuario marcó como útil (opcional)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_usage_trainer ON trainer_content_usage_logs(trainer_id);
CREATE INDEX idx_content_usage_content ON trainer_content_usage_logs(content_id);
CREATE INDEX idx_content_usage_date ON trainer_content_usage_logs(created_at);
```

---

## 7. IMPLEMENTACIÓN PRÁCTICA

### 🔧 FUNCIÓN PRINCIPAL: `getTrainerResponse`

```typescript
async function getTrainerResponse(
  trainerSlug: 'jey',
  userMessage: string,
  userContext: UserContext
): Promise<{
  response: string
  sources: Source[]
  structuredData?: WorkoutData | DietData
  safetyWarnings?: string[]
}> {
  
  // 1. Detectar seguridad
  const safetyIssues = detectSafetyIssues(userMessage)
  if (safetyIssues.length > 0) {
    return {
      response: generateSafetyResponse(safetyIssues, userMessage),
      sources: [],
      safetyWarnings: safetyIssues
    }
  }
  
  // 2. Analizar intención
  const intent = analyzeIntent(userMessage)
  
  // 3. Buscar en biblioteca
  const relevantContent = await searchTrainerLibrary(
    trainerId,
    userMessage,
    {
      contentType: intent === 'workout_request' ? 'workout' : 
                   intent === 'diet_request' ? 'diet' : 'all',
      targetGoal: userContext.goal,
      intensity: userContext.intensity
    }
  )
  
  // 4. Si no hay contenido relevante
  if (relevantContent.length === 0) {
    return {
      response: "No tengo información específica sobre eso en mi material. " +
                "¿Puedes reformular la pregunta o pedirme algo que sí tenga cubierto?",
      sources: []
    }
  }
  
  // 5. Generar respuesta
  let response = await generateResponse(
    userMessage,
    relevantContent,
    userContext,
    trainerPersona
  )
  
  // 6. Si es dieta, verificar y completar
  if (intent === 'diet_request') {
    const verified = await verifyAndCompleteDietResponse(
      response,
      userContext.goal,
      relevantContent
    )
    response = verified.completedResponse
  }
  
  // 7. Añadir disclaimer
  response += "\n\n---\n⚠️ Recordatorio: Este plan está basado en la información que compartiste y el material de Jey. No sustituye el asesoramiento profesional."
  
  // 8. Log uso
  await logContentUsage(trainerId, userId, relevantContent[0].id, userMessage)
  
  return {
    response,
    sources: relevantContent.map(c => ({
      type: c.content_type,
      id: c.id,
      title: c.structured_data.title,
      excerpt: extractExcerpt(c.raw_content, userMessage)
    })),
    structuredData: intent === 'workout_request' || intent === 'diet_request' 
      ? relevantContent[0].structured_data 
      : undefined
  }
}
```

---

## RESUMEN DE ENTREGABLES

✅ **1. Especificación del flujo RAG**: Completado
✅ **2. Estructura de plantillas**: Completado (workout y diet)
✅ **3. Verificador de dieta**: Completado (checklist + anti-bucle)
✅ **4. Formato de respuesta**: Completado (plantillas de salida)
✅ **5. Reglas de seguridad**: Completado (detección + disclaimers)
✅ **6. Requisitos técnicos**: Completado (tablas, indexación, versionado, logs)

**¿Quieres que empiece a implementar el código del sistema RAG ahora?**

