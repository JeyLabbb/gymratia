# Guía de Integración del Sistema RAG

## Estado Actual

✅ **Completado:**
- Especificación completa del sistema RAG (`RAG_SYSTEM_SPEC.md`)
- Funciones base del sistema RAG (`src/lib/rag-system.ts`)
- Verificador de completitud de dieta (`src/lib/diet-verifier.ts`)
- SQL para tablas de biblioteca (`create-rag-tables.sql`)
- Renombrado Edu → Jey
- Desactivación de Carolina

🔄 **Pendiente de Integrar:**
- Integración RAG en el flujo de chat
- Búsqueda en biblioteca antes de generar respuesta
- Verificador de dieta en respuestas
- Detección de seguridad en chat

## Pasos para Completar la Integración

### 1. Ejecutar SQL de Tablas RAG

```sql
-- Ejecutar en Supabase SQL Editor
-- Archivo: create-rag-tables.sql
```

### 2. Migrar Contenido Existente a Biblioteca

```typescript
// Script para migrar trainer_workouts y trainer_diets a trainer_content_library
// Se puede ejecutar una vez para indexar contenido existente
```

### 3. Integrar RAG en `src/lib/openai-chat.ts`

```typescript
// Antes de llamar a OpenAI, buscar en biblioteca:
import { searchTrainerLibrary, detectSafetyIssues, generateSafetyResponse } from '@/lib/rag-system'

// En chatConversational, añadir:
const safetyIssues = detectSafetyIssues(userMessage)
if (safetyIssues.length > 0) {
  return generateSafetyResponse(safetyIssues, userMessage)
}

const relevantContent = await searchTrainerLibrary(
  trainerId,
  userMessage,
  { targetGoal: userContext.goal }
)

// Inyectar contenido relevante en system prompt
```

### 4. Integrar Verificador de Dieta

```typescript
// En respuestas de dieta, después de generar:
import { verifyAndCompleteDietResponse } from '@/lib/diet-verifier'

if (intent === 'diet_request') {
  const verified = await verifyAndCompleteDietResponse(
    aiResponse,
    userContext.goal,
    relevantContent
  )
  aiResponse = verified.completedResponse
}
```

### 5. Actualizar System Prompt con Material

```typescript
// Añadir al system prompt:
const materialContext = relevantContent.map(c => 
  `Material disponible: ${c.structured_data.title}\n${c.raw_content.substring(0, 1000)}`
).join('\n\n')

systemPrompt += `\n\nMATERIAL DEL ENTRENADOR DISPONIBLE:\n${materialContext}\n\n
⚠️ CRÍTICO: Solo puedes usar información de este material. Si no está aquí, di que no lo tienes.`
```

## Próximos Pasos Recomendados

1. **Ejecutar SQL** → Crear tablas
2. **Migrar contenido** → Indexar workouts y diets existentes
3. **Integrar en chat** → Modificar `openai-chat.ts`
4. **Probar** → Verificar que funciona correctamente
5. **Mejorar búsqueda** → Añadir embeddings si es necesario

