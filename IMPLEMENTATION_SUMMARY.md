# Resumen de Implementación: Sistema de Dos Modos y Visibilidad de Entrenadores

## Cambios Realizados

### 1. Esquema de Base de Datos

**Archivo:** `update-trainers-visibility-system.sql`

- **Tabla `trainers`**: Añadidos campos:
  - `visibility_status`: DRAFT | PRIVATE | PENDING_REVIEW | PUBLIC | REJECTED
  - `requested_at`: Timestamp de solicitud
  - `reviewed_at`: Timestamp de revisión
  - `admin_review_token`: Token único para revisión
  - `certification`: Título/certificación
  - `social_handle`: Usuario/handle de redes sociales
  - `social_proof`: Prueba social (clientes satisfechos)

- **Tabla `user_messages`**: Nueva tabla para mensajes in-app
  - `user_id`, `type`, `title`, `body`, `read_at`, `created_at`
  - RLS policies para que usuarios vean solo sus mensajes

- **Políticas RLS actualizadas**: Solo entrenadores PUBLIC aparecen en listas públicas

### 2. Pantalla de Elección de Modo

**Archivo:** `src/app/_components/ModeSelectionScreen.tsx`

- Pantalla inicial para usuarios no logueados
- Permite elegir entre "Alumno" o "Entrenador"
- Guarda `preferred_mode` en localStorage
- Texto tranquilizador: "Puedes cambiarlo cuando quieras"

**Archivo:** `src/app/page.tsx`

- Muestra `ModeSelectionScreen` si no hay modo seleccionado
- Guarda `preferred_mode` y `user_mode` en localStorage

### 3. Guards de Perfiles

**Archivo:** `src/app/_components/ProfileGuard.tsx`

- Componente que verifica si el usuario tiene el perfil necesario
- Si no tiene perfil de alumno → CTA "Completar perfil de alumno"
- Si no tiene perfil de entrenador → CTA "Crear perfil de entrenador"
- Redirige a `/onboarding/basic` o `/trainers/register` según corresponda

### 4. Creación de Perfil Entrenador (DRAFT por defecto)

**Archivo:** `src/app/api/trainer/register/route.ts`

- Al crear trainerProfile, se establece `visibility_status = 'DRAFT'`
- Se genera `activation_link` único para acceso privado
- Se guardan campos: `certification`, `social_handle`, `social_proof`

**Archivo:** `src/app/trainers/register/page.tsx`

- Añadidos campos al formulario:
  - Certificación/título (obligatorio para público)
  - Usuario/handle de redes sociales (obligatorio para público)
  - Clientes satisfechos/prueba social (obligatorio para público)

### 5. Sistema de Solicitud de Público

**Archivo:** `src/app/api/trainer/request-public/route.ts`

- Valida que todos los campos obligatorios estén completos:
  - Foto de perfil
  - Certificación
  - Usuario/handle de redes sociales
  - Prueba social
  - Descripción/bio
- Genera token único para revisión
- Cambia estado a `PENDING_REVIEW`
- Envía email a admin (jeylabbb@gmail.com)

**Archivo:** `src/app/_components/RequestPublicModal.tsx`

- Modal para solicitar aparecer en público
- Muestra qué campos faltan
- Checkbox obligatorio para aceptar términos
- Validación antes de enviar

**Archivo:** `src/app/trainers/dashboard/page.tsx`

- Muestra estado de visibilidad:
  - DRAFT/PRIVATE: "Tu perfil está en borrador", botón "Copiar link", botón "Solicitar aparecer en público"
  - PENDING_REVIEW: "Solicitud pendiente de revisión"
  - PUBLIC: "Tu perfil está visible públicamente"
  - REJECTED: "Solicitud rechazada", botón "Volver a solicitar"

### 6. Sistema de Email y Revisión Admin

**Archivo:** `src/app/api/admin/send-review-email/route.ts`

- Envía email a jeylabbb@gmail.com con:
  - Datos del entrenador
  - Link de revisión con token único

**Archivo:** `src/app/api/admin/review-trainer/route.ts`

- Endpoint POST para aceptar/rechazar
- Valida token único
- Actualiza `visibility_status` a PUBLIC o REJECTED
- Crea mensaje in-app para el entrenador
- Invalida token después de usar

**Archivo:** `src/app/admin/review-trainer/page.tsx`

- Página simple con CTA "Sí, aceptar" / "No, rechazar"
- Lee token de query params
- Muestra resultado de la acción

### 7. Sistema de Mensajes/Notificaciones

**Archivo:** `src/app/api/messages/route.ts`

- GET: Obtiene mensajes del usuario ordenados por fecha
- PUT: Marca mensaje como leído

**Archivo:** `src/app/_components/MessagesPanel.tsx`

- Panel modal con lista de mensajes
- Muestra contador de no leídos
- Formato de fecha legible
- Marca como leído al hacer click

**Archivo:** `src/app/_components/PersonalizedNavbar.tsx`

- Añadido icono de campana (Bell) con contador de no leídos
- Abre `MessagesPanel` al hacer click
- Recarga contador al cerrar panel

### 8. Lista de Entrenadores (Solo PUBLIC)

**Archivo:** `src/app/trainers/page.tsx`

- Query actualizado: `.eq('visibility_status', 'PUBLIC')`
- Solo muestra entrenadores con estado PUBLIC

### 9. Formulario de Settings

**Archivo:** `src/app/trainers/settings/page.tsx`

- Añadidos campos:
  - Certificación/título
  - Usuario/handle de redes sociales
  - Clientes satisfechos/prueba social
- Sección separada: "Información para aparecer en público"
- Indicadores de campos obligatorios (*)

## Flujo Completo

### Usuario No Logueado
1. Ve pantalla de elección de modo
2. Elige "Alumno" o "Entrenador"
3. Se guarda `preferred_mode`
4. Ve home del modo seleccionado

### Usuario Logueado - Cambio de Modo
1. Cambia toggle en navbar
2. Si no tiene perfil del modo → ve CTA para crear perfil
3. Si tiene perfil → ve home del modo

### Entrenador - Crear Perfil
1. Va a `/trainers/register`
2. Completa formulario (incluyendo campos obligatorios)
3. Perfil se crea con `visibility_status = 'DRAFT'`
4. Puede usar link privado para compartir

### Entrenador - Solicitar Público
1. Completa campos obligatorios en settings
2. Va a dashboard → ve botón "Solicitar aparecer en público"
3. Abre modal → valida campos → acepta términos → envía
4. Estado cambia a `PENDING_REVIEW`
5. Email se envía a admin con link de revisión

### Admin - Revisar Solicitud
1. Recibe email con link
2. Click en link → va a `/admin/review-trainer?token=...`
3. Ve página simple con CTA "Aceptar" / "Rechazar"
4. Click en acción → se actualiza estado
5. Se crea mensaje in-app para el entrenador

### Entrenador - Recibe Notificación
1. Ve icono de campana con contador
2. Click → abre panel de mensajes
3. Ve mensaje: "Aceptado" o "Rechazado"
4. Si rechazado → puede volver a solicitar

## Archivos Creados/Modificados

### Nuevos Archivos
- `update-trainers-visibility-system.sql`
- `src/app/_components/ModeSelectionScreen.tsx`
- `src/app/_components/ProfileGuard.tsx`
- `src/app/_components/RequestPublicModal.tsx`
- `src/app/_components/MessagesPanel.tsx`
- `src/app/api/trainer/request-public/route.ts`
- `src/app/api/admin/send-review-email/route.ts`
- `src/app/api/admin/review-trainer/route.ts`
- `src/app/api/messages/route.ts`
- `src/app/admin/review-trainer/page.tsx`

### Archivos Modificados
- `src/app/page.tsx` - Pantalla de elección de modo
- `src/app/trainers/page.tsx` - Solo mostrar PUBLIC
- `src/app/trainers/register/page.tsx` - Campos obligatorios
- `src/app/api/trainer/register/route.ts` - DRAFT por defecto
- `src/app/trainers/dashboard/page.tsx` - Estado y botón solicitar
- `src/app/trainers/settings/page.tsx` - Campos obligatorios
- `src/app/_components/PersonalizedNavbar.tsx` - Icono mensajes

## Próximos Pasos (Para Producción)

1. **Implementar envío real de email**: Actualmente solo loguea. Integrar Resend/SendGrid
2. **Añadir expiración de token**: Los tokens de revisión deberían expirar (ej: 7 días)
3. **Mejorar seguridad del link de revisión**: Añadir validación adicional si es necesario
4. **Añadir date-fns al package.json**: Si no está instalado, añadirlo para formateo de fechas

## Notas Importantes

- El sistema permite acceso por link incluso si está en DRAFT/PRIVATE (via `activation_link`)
- Los entrenadores REJECTED pueden volver a solicitar
- El sistema de mensajes es simple (no chat en tiempo real)
- El email a admin actualmente solo loguea (implementar servicio real en producción)
