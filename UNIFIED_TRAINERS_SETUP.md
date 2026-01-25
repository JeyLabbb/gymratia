# Guía Unificada de Configuración de Entrenadores

## 📋 Scripts SQL a Ejecutar (en orden)

### 1. Estructura Base de Entrenadores
```sql
-- Ejecutar: create-trainers-structure.sql
```
Este script:
- Crea la tabla `trainers` con todas las columnas necesarias
- Crea tablas relacionadas (certificados, workouts, diets, relaciones)
- Configura RLS policies
- Añade automáticamente columnas faltantes si la tabla ya existe
- **Renombra automáticamente** la columna `name` a `trainer_name` si existe

### 2. Buckets de Storage
```sql
-- Ejecutar: create-storage-buckets.sql
```
Este script:
- Crea el bucket `trainer-certificates` para certificados
- Configura políticas RLS para subida de archivos
- Crea otros buckets necesarios (avatars, progress-photos, posts)

### 3. Sistema RAG (Opcional - para IA)
```sql
-- Ejecutar: create-rag-tables.sql
```
Este script:
- Crea tablas para el sistema RAG de entrenadores IA
- Permite búsqueda semántica de contenido

## 🔧 Si Tienes Problemas

### Error: "column name does not exist" o "column name violates not-null constraint"

**Solución automática:**
El script `create-trainers-structure.sql` ahora detecta y renombra automáticamente la columna `name` a `trainer_name`.

**Solución manual (si la automática falla):**
```sql
-- Ejecutar: fix-trainers-table.sql
```
O ejecutar directamente:
```sql
ALTER TABLE trainers RENAME COLUMN name TO trainer_name;
```

## 📝 Estructura de la Tabla `trainers`

La tabla `trainers` debe tener estas columnas:

- ✅ `id` (UUID, PRIMARY KEY)
- ✅ `user_id` (UUID, NOT NULL, UNIQUE, referencia a auth.users)
- ✅ `slug` (TEXT, NOT NULL, UNIQUE)
- ✅ `trainer_name` (TEXT, NOT NULL) ← **IMPORTANTE: NO "name"**
- ✅ `full_name` (TEXT)
- ✅ `email` (TEXT)
- ✅ `avatar_url` (TEXT)
- ✅ `specialty` (TEXT)
- ✅ `description` (TEXT)
- ✅ `philosophy` (TEXT)
- ✅ `experience_years` (TEXT)
- ✅ `privacy_mode` (TEXT, DEFAULT 'public')
- ✅ `activation_link` (TEXT)
- ✅ `activation_code` (TEXT)
- ✅ `is_active` (BOOLEAN, DEFAULT true)
- ✅ `is_verified` (BOOLEAN, DEFAULT false)
- ✅ `verification_status` (TEXT, DEFAULT 'pending')
- ✅ `total_students` (INTEGER, DEFAULT 0)
- ✅ `active_students` (INTEGER, DEFAULT 0)
- ✅ `total_ratings` (INTEGER, DEFAULT 0)
- ✅ `average_rating` (NUMERIC(3,2), DEFAULT 0)
- ✅ `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- ✅ `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

## 🔍 Verificar Estructura

Para verificar que tu tabla tiene la estructura correcta:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'trainers' AND table_schema = 'public'
ORDER BY ordinal_position;
```

Debe mostrar `trainer_name` (NO `name`).

## ✅ Checklist de Configuración

- [ ] Ejecutar `create-trainers-structure.sql`
- [ ] Ejecutar `create-storage-buckets.sql`
- [ ] Verificar que la columna se llama `trainer_name` (no `name`)
- [ ] Probar registro de entrenador
- [ ] Probar subida de certificados
- [ ] Verificar que el dashboard de entrenador carga correctamente

## 🚨 Problemas Comunes

### 1. "Bucket not found" al subir certificados
**Solución:** Ejecutar `create-storage-buckets.sql`

### 2. "column name does not exist"
**Solución:** El script SQL ya lo corrige automáticamente. Si persiste, ejecutar `fix-trainers-table.sql`

### 3. "null value in column trainer_name"
**Solución:** Asegurarse de que el formulario de registro envía `trainerName` correctamente

---

**Todo está unificado y organizado. Los scripts SQL manejan automáticamente las migraciones y correcciones necesarias.**

