# Corrección de Tabla Trainers - Guía Completa

## Problema
La tabla `trainers` puede tener una columna `name` en lugar de `trainer_name`, causando errores al crear perfiles de entrenador.

## Solución

### 1. Ejecutar Script de Corrección
Ejecuta el script `fix-trainers-table.sql` en Supabase SQL Editor. Este script:
- Detecta si existe la columna `name`
- La renombra a `trainer_name` si es necesario
- Copia datos si ambas columnas existen
- Asegura que `trainer_name` sea NOT NULL

### 2. Estructura Correcta de la Tabla
La tabla `trainers` debe tener:
- `trainer_name` (TEXT NOT NULL) - Nombre como entrenador
- `full_name` (TEXT) - Nombre completo del usuario
- `slug` (TEXT NOT NULL UNIQUE) - Slug único
- `user_id` (UUID NOT NULL UNIQUE) - Referencia a auth.users

### 3. Uso en el Código

#### Base de Datos (tabla `trainers`)
```typescript
// ✅ CORRECTO - Usar trainer_name
const { data: trainer } = await supabase
  .from('trainers')
  .select('trainer_name, full_name, slug')
  .eq('user_id', userId)
  .single()

// Usar: trainer.trainer_name
```

#### Entrenadores IA Predefinidos (personas.ts)
```typescript
// ✅ CORRECTO - Usar name (viene de personas.ts)
import { getTrainerBySlug } from '@/lib/personas'
const trainer = getTrainerBySlug('jey')

// Usar: trainer.name (es un Trainer de personas.ts)
```

### 4. Archivos que Usan trainer_name (BD)
- `src/app/trainers/dashboard/page.tsx` - ✅ Usa `trainer.trainer_name`
- `src/app/trainers/onboarding/page.tsx` - ✅ Usa `trainer.trainer_name`
- `src/app/api/trainer/register/route.ts` - ✅ Inserta `trainer_name`

### 5. Archivos que Usan name (personas.ts)
- `src/app/trainers/page.tsx` - ✅ Usa `trainer.name` (de personas)
- `src/app/_components/ChatGPTStyleChat.tsx` - ✅ Usa `trainer.name` (de personas)
- Todos los componentes que muestran entrenadores IA predefinidos

## Verificación

Después de ejecutar el script, verifica:

```sql
-- Verificar estructura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trainers' 
AND table_schema = 'public'
AND column_name IN ('name', 'trainer_name');

-- Debe mostrar solo trainer_name, NO name
```

## Notas Importantes

1. **NO confundir**:
   - `trainer.trainer_name` → De la tabla `trainers` (BD) - Entrenadores reales
   - `trainer.name` → De `personas.ts` - Entrenadores IA predefinidos (Jey, Carolina)

2. **Si el error persiste**:
   - Ejecuta `fix-trainers-table.sql` de nuevo
   - Verifica que no haya restricciones o índices que usen `name`
   - Si hay datos, el script los preserva

3. **Para nuevos entrenadores**:
   - Siempre usar `trainer_name` al insertar en la tabla `trainers`
   - El código ya está corregido en `src/app/api/trainer/register/route.ts`

