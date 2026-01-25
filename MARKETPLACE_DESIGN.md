# Marketplace de Entrenadores - Diseño Completo

## 1. LISTA DE PANTALLAS Y NAVEGACIÓN

### 📱 MODO ALUMNO

#### Navegación Principal (Bottom Tabs - Mobile First)
```
┌─────────────────────────────────────┐
│  [🏠 Inicio] [🔍 Explorar] [💬 Chat] │
│  [📊 Progreso] [👤 Perfil]          │
└─────────────────────────────────────┘
```

#### Pantallas Alumno:

**1. Onboarding / Auth**
- `auth/login` - Login/Registro
- `auth/register` - Crear cuenta
- `onboarding/basic` - Datos iniciales (altura, peso, objetivo)
- `onboarding/choose-trainer` - Elegir entrenador inicial (opcional)

**2. Inicio (Home)**
- `dashboard/page` - Dashboard principal
  - Resumen rápido: último peso, próximo entrenamiento, mensajes sin leer
  - Accesos rápidos: Entrenamiento de hoy, Comidas de hoy
  - Progreso semanal (mini gráfica)

**3. Explorar Entrenadores**
- `explore/page` - Feed de entrenadores
  - Lista ordenada por ranking
  - Cards con: foto, nombre, rating, nº alumnos activos, badge público/privado
  - Filtros: Todos / Públicos / Por objetivo
  - Búsqueda por nombre
- `explore/[trainerSlug]/page` - Perfil público del entrenador
  - Info: nombre, descripción, estilo, rating, reseñas
  - Preview de contenido (ejemplos)
  - Botón: "Activar este entrenador" / "Solicitar acceso" / "Ya activo"
- `explore/[trainerSlug]/activate` - Activación por link/código
  - Si es link directo: activación automática
  - Si es código: input para código
  - Confirmación y redirección

**4. Chat**
- `dashboard/chats/page` - Lista de chats
  - Chats activos con entrenadores
  - Badge de mensajes sin leer
- `dashboard/chat/[trainerSlug]/page` - Chat individual
  - Conversación con entrenador IA
  - Paneles laterales: Entrenamiento, Dieta, Meal Planner

**5. Progreso**
- `dashboard/progress/page` - Vista de progreso
  - Gráfica de peso (interactiva)
  - Lista de registros diarios
  - Fotos de progreso (carousel)
- `dashboard/progress/add-weight` - Añadir peso
- `dashboard/progress/add-photo` - Subir foto

**6. Entrenamientos**
- `dashboard/workouts/page` - Mis entrenamientos
  - Entrenamiento activo (tabla Excel)
  - Historial de semanas
  - Exportar datos

**7. Dieta**
- `dashboard/diet/page` - Mi dieta
  - Dieta activa del entrenador
  - Plan semanal de comidas (calendario)
  - Lista de compra

**8. Perfil**
- `dashboard/profile/page` - Mi perfil
  - Datos personales (altura, objetivo, etc.)
  - Mis entrenadores activos
  - Configuración
  - Cerrar sesión

---

### 🏋️ MODO ENTRENADOR

#### Navegación Principal (Bottom Tabs)
```
┌─────────────────────────────────────┐
│  [📊 Dashboard] [👥 Alumnos] [💬]   │
│  [📝 Contenido] [👤 Perfil]         │
└─────────────────────────────────────┘
```

#### Pantallas Entrenador:

**1. Onboarding Entrenador**
- `trainer/register` - Registro como entrenador
  - Formulario: nombre, estilo, descripción, foto
  - Configuración inicial de privacidad
- `trainer/onboarding` - Setup inicial
  - Subir contenido inicial (opcional)
  - Configurar visibilidad

**2. Dashboard**
- `trainer/dashboard/page` - Panel de métricas
  - **Métricas principales:**
    - Alumnos activos (hoy/semana/mes)
    - Retención 7 días (% que vuelve)
    - Actividad última semana (gráfica)
  - **Top alumnos:**
    - Quién ha entrado más veces últimas 24h
  - **Rating:**
    - Estrellas promedio + nº reseñas
    - Últimos comentarios (preview)
  - **Top objetivos:**
    - Gráfica de objetivos más comunes
  - **Tendencias:**
    - Crecimiento de alumnos
    - Actividad por día

**3. Alumnos**
- `trainer/students/page` - Lista de alumnos
  - Lista con: nombre, último acceso, progreso, estado
  - Filtros: Activos / Inactivos / Solicitudes pendientes
- `trainer/students/[studentId]/page` - Perfil del alumno
  - Datos: peso, altura, objetivo
  - Progreso: gráfica, fotos
  - Historial de interacciones

**4. Chat**
- `trainer/chats/page` - Conversaciones
  - Lista de chats con alumnos
  - Badge de mensajes sin leer

**5. Contenido**
- `trainer/content/page` - Gestión de contenido
  - Tabs: Entrenamientos / Dietas / Plantillas
- `trainer/content/workouts/new` - Crear entrenamiento
  - Formulario paso a paso:
    - Paso 1: Nombre y descripción
    - Paso 2: Días de la semana
    - Paso 3: Ejercicios por día (drag & drop)
    - Paso 4: Series, reps, tempo, descanso
    - Paso 5: Preview y guardar
- `trainer/content/workouts/[id]/edit` - Editar entrenamiento
- `trainer/content/diets/new` - Crear dieta
  - Formulario estructurado:
    - Reglas generales
    - Alimentos permitidos/controlados/prohibidos
    - Macros objetivo
    - Ejemplos de comidas
- `trainer/content/diets/[id]/edit` - Editar dieta
- `trainer/content/templates` - Plantillas reutilizables
  - Guardar entrenamientos/dietas como plantillas
  - Reutilizar para crear nuevos

**6. Perfil Entrenador**
- `trainer/profile/page` - Mi perfil público
  - Editar: nombre, foto, descripción, estilo
  - Configuración de privacidad:
    - Público / Privado / Solicitud
  - Generar link de invitación / código
  - Ver perfil público (preview)
- `trainer/profile/settings` - Configuración
  - Notificaciones
  - Monetización (si aplica)
  - Eliminar cuenta

**7. Analytics (Opcional - Futuro)**
- `trainer/analytics/page` - Analytics avanzados
  - Retención detallada
  - Engagement por alumno
  - Conversión de visitas a activaciones

---

## 2. FLUJOS CRÍTICOS PASO A PASO

### 🔄 FLUJO 1: Onboarding Alumno

```
1. Usuario llega a /auth/login
   └─> Opciones: Login / Registro / Google OAuth

2. Registro
   └─> Email + Password + Nombre
   └─> Acepta términos y condiciones
   └─> Crea cuenta

3. Onboarding Básico (/onboarding/basic)
   └─> Paso 1: Altura (cm)
   └─> Paso 2: Peso inicial (kg)
   └─> Paso 3: Objetivo (dropdown)
   └─> Paso 4: Foto opcional
   └─> Guarda en user_profiles

4. Elegir Entrenador (opcional, puede saltarse)
   └─> Opción A: Explorar y elegir
   └─> Opción B: "Lo haré después"
   └─> Si elige: activa entrenador automáticamente

5. Redirección a /dashboard
   └─> Si tiene entrenador: muestra contenido
   └─> Si no: CTA para explorar entrenadores
```

### 🔄 FLUJO 2: Explorar y Activar Entrenador

```
1. Usuario va a /explore
   └─> Ve feed ordenado por ranking
   └─> Jey aparece primero (hardcoded por ahora)

2. Usuario hace clic en card de entrenador
   └─> Va a /explore/[trainerSlug]
   └─> Ve perfil público completo

3. Decisión según visibilidad:
   
   A) PÚBLICO:
      └─> Botón: "Activar este entrenador"
      └─> Confirmación: "¿Activar Jey como tu entrenador?"
      └─> Si confirma:
          ├─> Crea relación en user_trainer_relationships
          ├─> Activa entrenador (is_active = true)
          ├─> Si había otro activo: lo desactiva
          └─> Redirección a /dashboard/chat/[trainerSlug]

   B) PRIVADO:
      └─> Botón: "Solicitar acceso"
      └─> Mensaje: "Este entrenador es privado. Envía una solicitud."
      └─> Si confirma:
          ├─> Crea solicitud en trainer_access_requests
          ├─> Notificación al entrenador
          └─> Mensaje: "Solicitud enviada. Te notificaremos cuando responda."

   C) SOLICITUD (si está habilitado):
      └─> Similar a privado pero con aprobación automática opcional

4. Activación por Link/Código:
   
   A) LINK:
      └─> Usuario recibe: https://app.com/activate/[trainerSlug]?token=abc123
      └─> Al abrir link:
          ├─> Si no está logueado: login → redirect a activación
          ├─> Si está logueado: activación directa
          └─> Crea relación y activa entrenador

   B) CÓDIGO:
      └─> Usuario va a /explore/activate
      └─> Input: "Introduce código de activación"
      └─> Valida código en trainer_activation_codes
      └─> Si válido: activa entrenador
      └─> Si inválido: error "Código no válido"
```

### 🔄 FLUJO 3: Rating y Comentarios

```
1. Usuario en perfil del entrenador (/explore/[trainerSlug])
   └─> Ve sección "Reseñas"
   └─> Si ya activó: puede dejar reseña
   └─> Si no: solo puede ver reseñas

2. Dejar reseña:
   └─> Clic en "Dejar reseña"
   └─> Modal:
       ├─> Estrellas (1-5)
       ├─> Comentario (opcional, max 500 chars)
       └─> Botón "Publicar"
   └─> Guarda en trainer_reviews
   └─> Actualiza rating promedio del entrenador
   └─> Notificación al entrenador (opcional)

3. Ver reseñas:
   └─> Lista de reseñas con:
       ├─> Estrellas
       ├─> Comentario
       ├─> Fecha
       └─> Nombre del alumno (anonimizado si quiere)
```

### 🔄 FLUJO 4: Entrenador Crea Contenido

```
1. Entrenador va a /trainer/content
   └─> Ve lista de entrenamientos y dietas creados
   └─> Botón: "Crear nuevo"

2. Crear Entrenamiento:
   └─> Paso 1: Nombre + Descripción
   └─> Paso 2: Seleccionar días (Lunes-Domingo)
   └─> Paso 3: Por cada día:
       ├─> Añadir ejercicio (búsqueda o crear nuevo)
       ├─> Series (número)
       ├─> Reps objetivo (ej: "8-12")
       ├─> Tempo (ej: "2-1-1-0")
       ├─> Descanso (segundos)
       ├─> Grupos musculares (tags)
       └─> Notas (opcional)
   └─> Paso 4: Preview completo
   └─> Paso 5: Guardar
   └─> Guarda en trainer_workouts

3. Crear Dieta:
   └─> Formulario estructurado:
       ├─> Nombre + Descripción
       ├─> Macros objetivo (calorías, proteína, carbs, grasas)
       ├─> Reglas generales (textarea)
       ├─> Alimentos permitidos (lista + búsqueda)
       ├─> Alimentos controlados (lista + cantidad)
       ├─> Alimentos prohibidos (lista)
       ├─> Ejemplos de comidas (opcional)
       └─> Guardar
   └─> Guarda en trainer_diets

4. Usar Plantilla:
   └─> Opción: "Usar plantilla"
   └─> Selecciona plantilla guardada
   └─> Edita y personaliza
   └─> Guarda como nuevo
```

### 🔄 FLUJO 5: Dashboard Entrenador

```
1. Entrenador accede a /trainer/dashboard
   └─> Ve métricas en tiempo real

2. Cálculo de métricas:
   └─> Alumnos activos: COUNT donde is_active = true
   └─> Retención 7 días: % que ha usado en últimos 7 días
   └─> Actividad: logs de acceso agrupados por día
   └─> Top alumnos: ORDER BY access_count DESC LIMIT 5
   └─> Rating: AVG de trainer_reviews.rating
   └─> Top objetivos: GROUP BY goal de user_profiles

3. Actualización:
   └─> Métricas se actualizan en tiempo real
   └─> Cache de 5 minutos para optimización
```

---

## 3. MODELO DE DATOS (Alto Nivel)

### 📊 TABLAS PRINCIPALES

#### **users** (usuarios base - Supabase Auth)
```
- id (UUID, PK)
- email
- created_at
- (otros campos de auth)
```

#### **user_profiles** (perfiles de alumnos)
```
- id (UUID, PK)
- user_id (FK → users.id)
- full_name
- height_cm
- weight_kg (último peso)
- goal (text)
- sex
- preferred_name
- avatar_url
- created_at
- updated_at
```

#### **trainers** (perfiles de entrenadores)
```
- id (UUID, PK)
- user_id (FK → users.id) [un usuario puede ser entrenador]
- slug (unique, ej: "jey")
- name
- photo_url
- style (text, ej: "alta intensidad")
- description (text, "para quién es")
- visibility_mode (enum: 'public' | 'private' | 'request')
- activation_code (nullable, si usa código)
- activation_link_token (nullable, si usa link)
- is_active (boolean, si está activo en la plataforma)
- rating_average (decimal, calculado)
- rating_count (integer, calculado)
- total_students (integer, calculado)
- active_students_week (integer, calculado)
- created_at
- updated_at
```

#### **user_trainer_relationships** (relación alumno-entrenador)
```
- id (UUID, PK)
- user_id (FK → users.id)
- trainer_id (FK → trainers.id)
- is_active (boolean, si está activo ahora)
- activated_at (timestamp)
- last_access_at (timestamp)
- access_count (integer, contador)
- created_at
```

#### **trainer_access_requests** (solicitudes de acceso privado)
```
- id (UUID, PK)
- user_id (FK → users.id)
- trainer_id (FK → trainers.id)
- status (enum: 'pending' | 'approved' | 'rejected')
- message (text, opcional)
- created_at
- responded_at
```

#### **trainer_reviews** (reseñas y ratings)
```
- id (UUID, PK)
- user_id (FK → users.id)
- trainer_id (FK → trainers.id)
- rating (integer, 1-5)
- comment (text, nullable)
- is_anonymous (boolean)
- created_at
- updated_at
```

#### **trainer_workouts** (entrenamientos creados por entrenador)
```
- id (UUID, PK)
- trainer_id (FK → trainers.id)
- title
- description (text, nullable)
- workout_data (JSONB) {
    days: [
      {
        day: "Lunes",
        exercises: [
          {
            name: "Press banca",
            sets: 4,
            reps: "6-8",
            tempo: "2-1-1-0",
            rest_seconds: 150,
            muscle_groups: ["Pecho", "Tríceps"],
            notes: "RIR 0-1"
          }
        ]
      }
    ]
  }
- is_template (boolean, si es plantilla reutilizable)
- created_at
- updated_at
```

#### **trainer_diets** (dietas creadas por entrenador)
```
- id (UUID, PK)
- trainer_id (FK → trainers.id)
- title
- description
- daily_calories (integer)
- daily_protein_g (integer)
- daily_carbs_g (integer)
- daily_fats_g (integer)
- diet_data (JSONB) {
    rules: "texto general",
    allowed_foods: ["pollo", "arroz"],
    controlled_foods: [{"name": "pasta", "quantity": "100g"}],
    prohibited_foods: ["azúcar refinado"],
    meal_examples: [...]
  }
- is_template (boolean)
- created_at
- updated_at
```

#### **user_workouts** (entrenamientos activos del alumno)
```
- id (UUID, PK)
- user_id (FK → users.id)
- trainer_id (FK → trainers.id)
- trainer_workout_id (FK → trainer_workouts.id, nullable)
- title
- description
- workout_data (JSONB, copia del entrenamiento)
- is_active (boolean)
- created_at
- updated_at
```

#### **user_diets** (dietas activas del alumno)
```
- id (UUID, PK)
- user_id (FK → users.id)
- trainer_id (FK → trainers.id)
- trainer_diet_id (FK → trainer_diets.id, nullable)
- title
- description
- daily_calories
- daily_protein_g
- daily_carbs_g
- daily_fats_g
- diet_data (JSONB)
- is_active (boolean)
- created_at
- updated_at
```

#### **progress_tracking** (registros de peso diario)
```
- id (UUID, PK)
- user_id (FK → users.id)
- date (date)
- weight_kg (decimal)
- body_fat_percentage (decimal, nullable)
- notes (text, nullable)
- created_at
- updated_at
```

#### **progress_photos** (fotos de progreso)
```
- id (UUID, PK)
- user_id (FK → users.id)
- photo_url (text, Supabase Storage)
- date (date)
- photo_type (enum: 'front' | 'side' | 'back' | 'other')
- notes (text, nullable)
- created_at
```

#### **trainer_chats** (chats con entrenadores IA)
```
- id (UUID, PK)
- user_id (FK → users.id)
- trainer_slug (text, ej: "jey")
- created_at
- updated_at
- last_message_at
```

#### **chat_messages** (mensajes del chat)
```
- id (UUID, PK)
- chat_id (FK → trainer_chats.id)
- role (enum: 'user' | 'assistant')
- content (text)
- created_at
```

#### **trainer_notifications** (notificaciones al entrenador)
```
- id (UUID, PK)
- trainer_id (FK → trainers.id)
- user_id (FK → users.id, nullable)
- type (enum: 'new_student' | 'new_review' | 'access_request' | 'student_progress')
- message (text)
- data (JSONB, metadata)
- read (boolean)
- created_at
```

#### **user_activity_logs** (logs de actividad para métricas)
```
- id (UUID, PK)
- user_id (FK → users.id)
- trainer_id (FK → trainers.id, nullable)
- action_type (enum: 'login' | 'view_workout' | 'view_diet' | 'chat' | 'add_weight')
- metadata (JSONB)
- created_at
```

---

## 4. REGLAS DE RANKING DEL FEED

### 🎯 Fórmula de Ranking (Simple MVP)

```
SCORE = (Rating × 0.4) + (Actividad × 0.4) + (Retención × 0.2)

Donde:
- Rating = promedio de estrellas (1-5) normalizado a 0-1
- Actividad = alumnos activos esta semana / 100 (capped en 1.0)
- Retención = % de alumnos que volvieron en últimos 7 días (0-1)

Ejemplo:
- Jey: Rating 4.5, 50 alumnos activos, 80% retención
  Score = (4.5/5 × 0.4) + (50/100 × 0.4) + (0.8 × 0.2)
        = 0.36 + 0.2 + 0.16 = 0.72

- Otro: Rating 3.0, 10 alumnos, 60% retención
  Score = (3.0/5 × 0.4) + (10/100 × 0.4) + (0.6 × 0.2)
        = 0.24 + 0.04 + 0.12 = 0.40
```

### 📊 Orden del Feed

1. **Hardcoded primero**: Jey siempre aparece primero (por ahora)
2. **Resto ordenado por SCORE DESC**
3. **Filtros**:
   - Todos (default)
   - Solo públicos
   - Por objetivo (filtra por goal del usuario)

### 🔄 Actualización del Ranking

- **Cálculo**: Cada vez que se carga el feed
- **Cache**: 5 minutos (para no recalcular constantemente)
- **Triggers**: Se recalcula cuando:
  - Nueva reseña
  - Cambio en alumnos activos
  - Cambio en actividad

---

## 5. DECISIONES UX

### 🎨 Cómo Mostrar Público/Privado/Solicitud

#### En el Feed (/explore):
```
┌─────────────────────────────┐
│ [Foto]  Jey                 │
│         ⭐ 4.5 (120)        │
│         50 alumnos activos  │
│         [🌐 Público]        │ ← Badge pequeño
└─────────────────────────────┘

┌─────────────────────────────┐
│ [Foto]  Otro Entrenador     │
│         ⭐ 4.0 (80)          │
│         20 alumnos activos  │
│         [🔒 Privado]         │ ← Badge diferente
└─────────────────────────────┘
```

#### En el Perfil del Entrenador:
```
┌─────────────────────────────┐
│ Perfil Público              │
│                             │
│ [Foto]  Jey                 │
│ ⭐ 4.5 (120 reseñas)        │
│ 🌐 Público                  │ ← Badge más grande
│                             │
│ Descripción...              │
│                             │
│ [Activar este entrenador]   │ ← Botón principal
└─────────────────────────────┘

┌─────────────────────────────┐
│ Perfil Privado              │
│                             │
│ [Foto]  Entrenador X        │
│ ⭐ 4.0 (80 reseñas)         │
│ 🔒 Privado                  │ ← Badge + explicación
│                             │
│ "Solo alumnos con invitación│
│  pueden activar este        │
│  entrenador"                │
│                             │
│ [Solicitar acceso]          │ ← Botón diferente
└─────────────────────────────┘
```

### 🏆 Cómo Mostrar que Jey Va Primero

**Opción 1: Badge "Recomendado" (Recomendado)**
```
┌─────────────────────────────┐
│ [⭐ RECOMENDADO]             │ ← Badge destacado
│ [Foto]  Jey                 │
│         ⭐ 4.5 (120)        │
│         50 alumnos activos  │
│         [🌐 Público]        │
└─────────────────────────────┘
```

**Opción 2: Sección Separada**
```
┌─────────────────────────────┐
│ ⭐ Entrenador Recomendado   │
│ ┌─────────────────────────┐ │
│ │ [Foto]  Jey             │ │
│ │         ⭐ 4.5 (120)    │ │
│ │         50 alumnos      │ │
│ │         [Activar]       │ │
│ └─────────────────────────┘ │
│                             │
│ 🔍 Todos los Entrenadores   │
│ ┌─────────────────────────┐ │
│ │ [Otros entrenadores...] │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Opción 3: Pin Fijo (Más agresivo)**
```
┌─────────────────────────────┐
│ 📌 Jey (Fijo arriba)         │ ← Pin icon
│ [Foto]  Jey                 │
│         ⭐ 4.5 (120)        │
│         50 alumnos activos  │
│         [🌐 Público]        │
└─────────────────────────────┘
│                             │
│ ─────────────────────────── │ ← Separador
│                             │
│ [Resto de entrenadores...]  │
```

**Recomendación**: Opción 1 (Badge "Recomendado") - sutil pero claro.

### 🔗 Activación: Link vs Código

**DECISIÓN: LINK (Recomendado)**

**Razones:**
- Más simple para el usuario (solo click)
- Más fácil de compartir (WhatsApp, email, etc.)
- No hay riesgo de errores de tipeo
- Mejor UX mobile (deep linking)

**Implementación:**
```
Link formato: https://app.com/activate/jey?token=abc123xyz

Flujo:
1. Entrenador genera link en su perfil
2. Comparte link con alumnos
3. Alumno abre link → si no está logueado: login → activación automática
4. Si ya está logueado: activación directa
```

**Alternativa Código (si prefieres):**
```
Código formato: JEY-ABC123 (6 caracteres alfanuméricos)

Flujo:
1. Entrenador genera código en su perfil
2. Comparte código con alumnos
3. Alumno va a /explore/activate
4. Introduce código → validación → activación
```

---

## 6. CHECKLIST DE PRIVACIDAD Y DISCLAIMERS

### ✅ Privacidad de Datos

- [ ] **Fotos de progreso**
  - Almacenadas en Supabase Storage (privado)
  - Solo accesibles por el usuario propietario
  - No compartidas con otros usuarios
  - RLS en Supabase configurado

- [ ] **Pesos diarios**
  - Almacenados en `progress_tracking` (privado)
  - Solo el usuario puede ver sus propios datos
  - No visibles para otros usuarios
  - RLS configurado

- [ ] **Datos personales**
  - Altura, peso, objetivo: privados
  - Solo visibles para el entrenador IA asignado
  - No compartidos entre alumnos

- [ ] **Consentimiento al registro**
  - Checkbox obligatorio: "Acepto términos y condiciones"
  - Checkbox obligatorio: "Acepto política de privacidad"
  - Links a documentos legales

### 📄 Disclaimers para Alumnos

**Texto sugerido (en /auth/register y footer):**

```
"IMPORTANTE - AVISO LEGAL

Esta aplicación es una herramienta de apoyo para el fitness y la nutrición. 
NO sustituye el asesoramiento de profesionales sanitarios, médicos, 
nutricionistas o entrenadores personales certificados.

Antes de comenzar cualquier programa de entrenamiento o dieta, consulta 
con un profesional de la salud, especialmente si:
- Tienes alguna condición médica
- Estás tomando medicación
- Estás embarazada o en período de lactancia
- Tienes lesiones o limitaciones físicas

Los entrenadores virtuales (IA) proporcionan recomendaciones generales 
basadas en la información que compartes, pero no pueden diagnosticar, 
tratar o prevenir enfermedades.

El uso de esta aplicación es bajo tu propia responsabilidad. No nos 
hacemos responsables de lesiones, problemas de salud o resultados 
no deseados derivados del uso de la aplicación.

Si experimentas dolor, malestar o cualquier síntoma durante el 
entrenamiento, detente inmediatamente y consulta con un profesional."
```

### 📄 Disclaimers para Entrenadores

**Texto sugerido (en /trainer/register y /trainer/profile):**

```
"RESPONSABILIDAD DEL ENTRENADOR

Al crear contenido en esta plataforma, confirmas que:
- Eres responsable del contenido que subes
- No subirás información falsa, engañosa o peligrosa
- Tus recomendaciones son apropiadas y seguras
- Respetas las mejores prácticas de entrenamiento y nutrición

La plataforma se reserva el derecho de:
- Revisar y verificar el contenido subido
- Eliminar contenido que considere inapropiado o peligroso
- Suspender o cerrar cuentas que incumplan estas normas
- Tomar medidas legales si es necesario

No nos hacemos responsables del contenido creado por entrenadores. 
Cada entrenador es responsable de sus propias recomendaciones y 
del impacto que puedan tener en sus alumnos.

Al usar esta plataforma como entrenador, aceptas estas condiciones."
```

### 🔒 Checklist Técnico de Privacidad

- [ ] **RLS (Row Level Security) en Supabase**
  - [ ] `progress_tracking`: solo el usuario puede ver sus registros
  - [ ] `progress_photos`: solo el usuario puede ver sus fotos
  - [ ] `user_profiles`: solo el usuario y su entrenador asignado
  - [ ] `trainer_chats`: solo el usuario puede ver sus chats
  - [ ] `trainer_reviews`: públicos para lectura, solo el autor puede editar

- [ ] **Storage de Supabase**
  - [ ] Bucket `progress-photos`: privado, solo acceso autenticado
  - [ ] Políticas de acceso configuradas

- [ ] **Cookies y Sesiones**
  - [ ] Solo cookies esenciales para autenticación
  - [ ] No tracking de terceros sin consentimiento

- [ ] **GDPR Compliance (si aplica)**
  - [ ] Derecho al olvido (eliminar cuenta y datos)
  - [ ] Exportar datos del usuario
  - [ ] Política de privacidad clara

---

## 7. MONETIZACIÓN (Configurable)

### 💰 Modelo Recomendado: Alumnos Pagan

**Setup:**
```
- Alumnos: Suscripción mensual (5€/mes o 10€/mes)
- Entrenadores: Reciben % de lo generado por sus alumnos (5% por defecto, configurable)
- Plataforma: Se queda con el resto (95% por defecto)
```

**Implementación:**

#### Tabla: `subscriptions`
```
- id (UUID, PK)
- user_id (FK → users.id)
- trainer_id (FK → trainers.id, nullable, si es suscripción a entrenador específico)
- plan_type (enum: 'monthly' | 'yearly' | 'lifetime')
- amount (decimal, precio pagado)
- status (enum: 'active' | 'cancelled' | 'expired')
- starts_at (timestamp)
- ends_at (timestamp)
- created_at
```

#### Tabla: `trainer_earnings`
```
- id (UUID, PK)
- trainer_id (FK → trainers.id)
- subscription_id (FK → subscriptions.id)
- amount (decimal, ganancia del entrenador)
- percentage (decimal, % aplicado)
- period (date, mes/año)
- paid_out (boolean, si ya se pagó)
- created_at
```

#### Configuración en `.env`:
```env
SUBSCRIPTION_PRICE_MONTHLY=5.00
SUBSCRIPTION_PRICE_YEARLY=50.00
TRAINER_PERCENTAGE=0.05  # 5%
PLATFORM_PERCENTAGE=0.95 # 95%
```

**Flujo:**
1. Alumno se suscribe → pago procesado (Stripe/PayPal)
2. Se crea `subscription` con status 'active'
3. Cada mes: se calcula ganancia del entrenador
4. Se registra en `trainer_earnings`
5. Entrenador puede ver sus ganancias en dashboard

**Alternativa: Entrenadores Pagan**
```
- Entrenadores: Suscripción mensual (20€/mes)
- Alumnos: Gratis
- Configuración similar pero inversa
```

---

## 8. PRÓXIMOS PASOS DE IMPLEMENTACIÓN

### Fase 1: Base (Semana 1-2)
1. Renombrar Edu → Jey
2. Desactivar Carolina
3. Crear estructura de tablas nuevas
4. Implementar modo entrenador básico

### Fase 2: Marketplace (Semana 3-4)
1. Pantalla Explorar entrenadores
2. Sistema de activación (link)
3. Ratings y comentarios
4. Ranking del feed

### Fase 3: Contenido Entrenador (Semana 5-6)
1. Formularios de creación de entrenamientos
2. Formularios de creación de dietas
3. Sistema de plantillas

### Fase 4: Dashboard Entrenador (Semana 7)
1. Métricas y analytics
2. Gestión de alumnos
3. Notificaciones

### Fase 5: Monetización (Semana 8, opcional)
1. Integración de pagos
2. Sistema de suscripciones
3. Dashboard de ganancias

---

## 9. DECISIONES PENDIENTES

- [ ] ¿Link o código de activación? (Recomendado: LINK)
- [ ] ¿Modo "Solicitud" habilitado desde el inicio? (Recomendado: No, solo Público/Privado)
- [ ] ¿Monetización desde MVP o después? (Recomendado: Después)
- [ ] ¿Sistema de moderación de contenido? (Recomendado: Manual por ahora)
- [ ] ¿Límite de entrenadores activos por alumno? (Recomendado: 1 por ahora, múltiples después)

---

**¿Quieres que empiece a implementar alguna parte específica?**

