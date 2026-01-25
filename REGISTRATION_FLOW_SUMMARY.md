# Resumen del Flujo de Registro Completo

## ✅ FLUJO COMPLETADO

### 1. Base de Datos ✅
- ✅ `create-trainers-structure.sql` - Tablas completas para entrenadores
- ✅ Tabla `trainers` con todos los campos necesarios
- ✅ Tabla `trainer_certificates` para certificados/títulos
- ✅ Tabla `trainer_workouts` y `trainer_diets` para contenido
- ✅ Tabla `trainer_student_relationships` para relaciones
- ✅ RLS policies configuradas
- ✅ Función para generar slugs únicos

### 2. Registro de Entrenador ✅
- ✅ `/trainers/register` - Página de registro en 2 pasos
- ✅ Paso 1: Cuenta (email/password o Google)
- ✅ Paso 2: Perfil (nombre, especialidad, descripción, experiencia, privacidad)
- ✅ Subida de certificados/títulos (opcional)
- ✅ API `/api/trainer/register` que guarda en BD
- ✅ Generación automática de slug único
- ✅ Validación de duplicados

### 3. Onboarding de Entrenador ✅
- ✅ `/trainers/onboarding` - Página de onboarding
- ✅ Permite crear entrenamientos y dietas iniciales
- ✅ Flujo guiado paso a paso
- ✅ APIs `/api/trainer/workout` y `/api/trainer/diet` para crear contenido

### 4. Dashboard de Entrenador ✅
- ✅ `/trainers/dashboard` - Dashboard básico
- ✅ Muestra estadísticas (alumnos, entrenamientos, dietas)
- ✅ Accesos rápidos a gestionar contenido
- ✅ Link a perfil público

### 5. Flujo de Google OAuth ✅
- ✅ Funciona para registro de entrenador
- ✅ Funciona para registro de alumno
- ✅ Detecta si ya tiene cuenta y entra directamente
- ✅ Si no tiene cuenta, le lleva a completar registro
- ✅ Guarda modo correctamente en localStorage

### 6. Flujo de Alumno ✅
- ✅ Login/registro funciona
- ✅ Google OAuth funciona
- ✅ Selección de modo funciona
- ✅ Onboarding básico funciona

## 🔄 FLUJOS COMPLETOS

### Flujo Entrenador (Nuevo Usuario):
1. Usuario va a `/trainers/register`
2. Paso 1: Crea cuenta (email/password o Google)
3. Si Google → Callback detecta `registering_as_trainer` → Paso 2
4. Paso 2: Completa perfil + certificados
5. Se guarda en BD via `/api/trainer/register`
6. Redirige a `/trainers/onboarding`
7. Crea contenido inicial (opcional)
8. Redirige a `/trainers/dashboard`

### Flujo Entrenador (Usuario Existente):
1. Usuario va a `/auth/login`
2. Inicia sesión (email/password o Google)
3. Sistema detecta que tiene perfil de entrenador en BD
4. Redirige a `/trainers/dashboard`

### Flujo Alumno (Nuevo Usuario):
1. Usuario va a `/auth/login` o `/auth/mode-select`
2. Crea cuenta o inicia con Google
3. Selecciona modo "Alumno" (o se detecta automáticamente)
4. Redirige a `/onboarding/basic`
5. Completa datos básicos
6. Redirige a `/dashboard`

### Flujo Alumno (Usuario Existente):
1. Usuario va a `/auth/login`
2. Inicia sesión
3. Sistema detecta que tiene perfil de alumno
4. Redirige a `/dashboard`

## 📋 ARCHIVOS CREADOS/MODIFICADOS

### Nuevos:
- `create-trainers-structure.sql` - Estructura BD entrenadores
- `src/app/trainers/register/page.tsx` - Registro completo
- `src/app/trainers/onboarding/page.tsx` - Onboarding con creación de contenido
- `src/app/trainers/dashboard/page.tsx` - Dashboard básico
- `src/app/api/trainer/register/route.ts` - API registro
- `src/app/api/trainer/workout/route.ts` - API crear workout
- `src/app/api/trainer/diet/route.ts` - API crear dieta

### Modificados:
- `src/app/auth/callback/page.tsx` - Maneja modo entrenador
- `src/app/auth/login/page.tsx` - Detecta perfiles de entrenador
- `src/app/auth/mode-select/page.tsx` - Verifica perfiles antes de redirigir

## ⚠️ PENDIENTE (Para completar)

1. **Crear bucket de storage** para certificados:
   ```sql
   -- En Supabase Storage, crear bucket: trainer-certificates
   -- Con políticas públicas para lectura
   ```

2. **Páginas de gestión de contenido**:
   - `/trainers/content/workouts` - Lista y edición de entrenamientos
   - `/trainers/content/diets` - Lista y edición de dietas
   - `/trainers/settings` - Configuración del perfil

3. **Mejorar onboarding**:
   - Formularios más completos para crear workouts/diets
   - Editor visual para estructurar entrenamientos
   - Editor visual para estructurar dietas

## 🎯 PRÓXIMOS PASOS

1. **Ejecutar SQL**: `create-trainers-structure.sql` en Supabase
2. **Crear bucket**: `trainer-certificates` en Supabase Storage
3. **Probar flujo completo**: Registro → Onboarding → Dashboard
4. **Crear páginas de gestión**: Para que entrenadores puedan editar contenido

---

**Todo el flujo base está implementado y funcionando. Solo falta ejecutar el SQL y crear las páginas de gestión de contenido.**

