# Análisis y Fixes: Modo Entrenador

## 🐛 BUGS ENCONTRADOS + CAUSA + FIX

### 1. PERFIL PÚBLICO: URL EN CRUDO
**Bug:** Dashboard muestra URL en texto crudo (`/trainers/{slug}`)
**Causa:** Línea 209-214 en `trainers/dashboard/page.tsx` muestra link directo
**Fix:** Reemplazar por botón "Ver mi perfil" + opción discreta "Copiar enlace"

### 2. SLUG/URL: NOMBRE NO ÚNICO
**Bug:** No hay validación de nombre único, pueden haber duplicados
**Causa:** 
- Frontend: No valida antes de enviar
- Backend: `/api/trainer/register` no verifica slug único correctamente
- DB: Falta constraint UNIQUE en `trainer_name` (solo `slug` es único)
**Fix:** 
- Añadir constraint UNIQUE en `trainer_name` (case-insensitive)
- Validación frontend con debounce
- Validación backend antes de insertar
- Normalización: trim, lowercase, espacios → guiones

### 3. RUTAS ROTAS: "ENTRENADOR NO ENCONTRADO"
**Bug:** `/trainers/[slug]` solo busca en `personas.ts`, no en BD
**Causa:** Línea 10 en `trainers/[slug]/page.tsx` usa `getTrainerBySlug(slug)` que solo busca en array estático
**Fix:** 
- Modificar para buscar primero en BD (`trainers` table)
- Si no existe en BD, buscar en `personas.ts` (para Jey, Carolina)
- Combinar datos: BD tiene info real, `personas.ts` tiene configuración IA

### 4. RUTAS 404: `/trainers/settings`, `/trainers/content/workouts`, `/trainers/content/diets`
**Bug:** Links en dashboard apuntan a rutas que no existen
**Causa:** Rutas nunca fueron creadas
**Fix:** Crear las 3 páginas:
- `/trainers/settings` → Editar perfil completo
- `/trainers/content/workouts` → Gestión de contenido de entrenamientos
- `/trainers/content/diets` → Gestión de contenido de dietas

### 5. COPY: "PLANTILLAS" → "ALIMENTAR IA"
**Bug:** Texto dice "Crea y gestiona tus plantillas"
**Causa:** Copy pensado para sistema de plantillas, no para alimentar IA
**Fix:** Cambiar copy a:
- "Define tu metodología de entrenamiento"
- "Alimenta a tu IA con tu estilo"
- "Guía a tu entrenador virtual"

### 6. NAVEGACIÓN: FALTA BOTÓN VOLVER
**Bug:** No hay navegación clara desde perfil público
**Causa:** Solo breadcrumb, falta botón destacado
**Fix:** Añadir botón "Volver" / "Inicio" en header

### 7. HOME: NO DETECTA ENTRENADOR
**Bug:** Home muestra mensaje de alumno aunque seas entrenador
**Causa:** `EpicHomeAuthenticated` no verifica si es trainer
**Fix:** Detectar trainer y mostrar home diferente

### 8. SIGNUP/LOGIN: EMAIL VS GOOGLE
**Bug:** 
- Signup con email existente → error confuso
- Login email pero cuenta es Google → error confuso
**Causa:** `AuthProvider` no maneja errores específicos
**Fix:** 
- Detectar "email already exists" → "Esta cuenta ya existe, inicia sesión"
- Detectar "email not found" pero existe en Google → "Inicia sesión con Google"
- Unificar flujo: signup ok → auto-login

### 9. EDITAR PERFIL: FALTAN CAMPOS
**Bug:** No existe página de edición completa
**Causa:** Página nunca fue creada
**Fix:** Crear `/trainers/settings` con todos los campos editables como Jey

### 10. LISTADO: FALTAN SEÑALES VIRALES
**Bug:** No muestra usuarios activos ni rating
**Causa:** No se calculan ni muestran
**Fix:** 
- Añadir cálculo de `active_students` y `average_rating`
- Mostrar en cards con iconos
- Ordenar por números por defecto

## 📋 CAMBIOS DE RUTAS/NAVEGACIÓN

### Rutas Nuevas a Crear:
1. `/trainers/settings` - Editar perfil entrenador
2. `/trainers/content/workouts` - Gestión entrenamientos
3. `/trainers/content/diets` - Gestión dietas
4. `/trainers/content/rules` - Normas del entrenador (opcional, puede ser tab)

### Rutas a Modificar:
1. `/trainers/[slug]` - Buscar en BD primero, luego personas.ts
2. `/trainers/dashboard` - Cambiar copy y links
3. `/` (home) - Detectar trainer y mostrar home diferente

## 🗄️ CAMBIOS DE DB/CONSTRAINTS

### SQL a Ejecutar:
```sql
-- 1. Añadir UNIQUE constraint en trainer_name (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trainers_trainer_name_unique 
ON trainers (LOWER(TRIM(trainer_name)));

-- 2. Asegurar que active_students y average_rating se calculen
-- (Ya existen columnas, solo falta trigger o función para actualizar)

-- 3. Añadir campos para edición de perfil (si faltan):
-- - social_media (JSONB) - Instagram, Twitter, etc.
-- - contact_phone (TEXT)
-- - contact_email (TEXT) - puede ser diferente al auth email
-- - ideal_for (TEXT[]) - array de tags
-- - offers (JSONB) - array de ofertas con iconos
```

## 📝 CAMBIOS DE UI/COPY

### Copy Final Sugerido:

**Dashboard Entrenador:**
- "Define tu metodología" (en lugar de "Crea plantillas")
- "Alimenta a tu IA" (en lugar de "Gestiona plantillas")
- "Guía a tu entrenador virtual con tu estilo"

**Botones:**
- "Ver mi perfil" (principal)
- "Copiar enlace" (secundario, discreto)

**Home Entrenador:**
- "Bienvenido, [nombre]"
- "Gestiona tu contenido y conecta con tus alumnos"
- CTAs: "Alimentar IA", "Ver perfil", "Ver métricas"

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Perfil público no muestra URL en crudo
- [ ] Nombre único validado (frontend + backend + DB)
- [ ] `/trainers/[slug]` encuentra entrenadores de BD
- [ ] `/trainers/settings` existe y funciona
- [ ] `/trainers/content/workouts` existe y funciona
- [ ] `/trainers/content/diets` existe y funciona
- [ ] Copy cambiado de "plantillas" a "alimentar IA"
- [ ] Navegación de vuelta añadida
- [ ] Home detecta trainer y muestra diferente
- [ ] Signup/login maneja errores correctamente
- [ ] Edición de perfil tiene todos los campos
- [ ] Listado muestra usuarios activos y rating
- [ ] No hay más "entrenador no encontrado" por bugs
- [ ] No hay más 404 en rutas de gestión

