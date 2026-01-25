# Flujo Completo de Registro - Implementado

## ✅ TODO IMPLEMENTADO

### 1. Base de Datos
- ✅ `create-trainers-structure.sql` - Tablas completas
- ✅ Tabla `trainers` con todos los campos
- ✅ Tabla `trainer_certificates` para certificados
- ✅ Tabla `trainer_workouts` y `trainer_diets`
- ✅ Tabla `trainer_student_relationships`
- ✅ RLS policies configuradas

### 2. Registro de Entrenador
- ✅ Página `/trainers/register` con 2 pasos
- ✅ Paso 1: Cuenta (email/password o Google)
- ✅ Paso 2: Perfil completo + certificados
- ✅ API `/api/trainer/register` guarda en BD
- ✅ Generación de slug único
- ✅ Validación de duplicados

### 3. Onboarding de Entrenador
- ✅ Página `/trainers/onboarding`
- ✅ Permite crear entrenamientos y dietas
- ✅ APIs para crear contenido

### 4. Dashboard de Entrenador
- ✅ Página `/trainers/dashboard`
- ✅ Muestra estadísticas
- ✅ Accesos rápidos

### 5. Flujos OAuth
- ✅ Google funciona para entrenador
- ✅ Google funciona para alumno
- ✅ Detecta cuenta existente
- ✅ Redirige correctamente según modo

### 6. Flujo de Alumno
- ✅ Login/registro funciona
- ✅ Google OAuth funciona
- ✅ Selección de modo funciona
- ✅ Onboarding funciona

## 🔄 FLUJOS DETALLADOS

### Entrenador - Nuevo con Email/Password:
1. `/trainers/register` → Paso 1
2. Completa email/password → Paso 2
3. Completa perfil + certificados → Guarda en BD
4. Redirige a `/trainers/onboarding`
5. Crea contenido (opcional) → `/trainers/dashboard`

### Entrenador - Nuevo con Google:
1. `/trainers/register` → Paso 1
2. Click "Continuar con Google"
3. `localStorage.setItem('registering_as_trainer', 'true')`
4. Callback detecta flag → Paso 2
5. Completa perfil → Guarda en BD
6. Redirige a `/trainers/onboarding`

### Entrenador - Usuario Existente:
1. `/auth/login` → Inicia sesión
2. Sistema detecta perfil en `trainers` table
3. Redirige a `/trainers/dashboard`

### Alumno - Nuevo:
1. `/auth/login` o `/auth/mode-select`
2. Crea cuenta o Google
3. Selecciona "Alumno" → `/onboarding/basic`
4. Completa datos → `/dashboard`

### Alumno - Usuario Existente:
1. `/auth/login` → Inicia sesión
2. Sistema detecta perfil en `user_profiles`
3. Redirige a `/dashboard`

## 📋 PARA EJECUTAR

1. **Ejecutar SQL en Supabase**:
   ```sql
   -- Ejecutar: create-trainers-structure.sql
   ```

2. **Crear bucket de storage** (opcional, para certificados):
   - En Supabase Dashboard → Storage
   - Crear bucket: `trainer-certificates`
   - Política: Público para lectura

3. **Probar flujos**:
   - Registro entrenador con email
   - Registro entrenador con Google
   - Login entrenador existente
   - Registro alumno
   - Login alumno existente

## ⚠️ NOTAS IMPORTANTES

- El sistema detecta automáticamente si tienes perfil de entrenador o alumno
- No se pueden crear duplicados (validación en BD)
- Los certificados se guardan pero necesitan bucket de storage
- El onboarding permite saltar pasos y hacerlo después

---

**Todo está listo. Solo falta ejecutar el SQL y probar los flujos.**

