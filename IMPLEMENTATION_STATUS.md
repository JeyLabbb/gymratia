# Estado de Implementación - Marketplace y RAG

## ✅ COMPLETADO

### 1. Renombrado Edu → Jey
- [x] Actualizado `personas.ts` con slug 'jey' y nombre 'Jey'
- [x] Actualizada personalidad de Jey (más "bro", motivador pero duro)
- [x] Añadida regla "NO INVENTES NADA" en system prompt

### 2. Desactivación de Carolina
- [x] Añadido campo `is_active: false` a Carolina en `personas.ts`
- [x] Creadas funciones helper `getActiveTrainers()` y `getTrainerBySlug()`

### 3. Sistema RAG - Especificación
- [x] Creado `RAG_SYSTEM_SPEC.md` con especificación completa
- [x] Creado `src/lib/rag-system.ts` con funciones base
- [x] Creado `src/lib/diet-verifier.ts` con verificador de completitud

## 🔄 PENDIENTE DE ACTUALIZAR

### Referencias de 'edu' → 'jey' (9 archivos)
- [ ] `src/app/api/trainer/auto-message/route.ts` - línea 136
- [ ] `src/app/dashboard/workouts/page.tsx` - línea 84
- [ ] `src/lib/openai-chat.ts` - líneas 77, 306
- [ ] `src/app/dashboard/diet/page.tsx` - línea 169
- [ ] `src/app/dashboard/chat/[slug]/page.tsx` - línea 34
- [ ] `src/app/trainers/edu/configure/page.tsx` - línea 13 (renombrar ruta también)
- [ ] `src/app/trainers/[slug]/page.tsx` - línea 16
- [ ] `src/app/api/trainer/welcome/route.ts` - línea 70

### Filtrar Carolina en listas
- [ ] `src/app/_components/EpicHomeAuthenticated.tsx` - línea 225
- [ ] `src/app/dashboard/chats/page.tsx` - línea 97
- [ ] `src/app/dashboard/page.tsx` - línea 201
- [ ] `src/app/trainers/page.tsx` - línea 21

### Integración RAG en Chat
- [ ] Actualizar `src/lib/openai-chat.ts` para usar RAG
- [ ] Integrar búsqueda en biblioteca antes de generar respuesta
- [ ] Añadir verificador de dieta en respuestas de dieta
- [ ] Integrar detección de seguridad

### Base de Datos
- [ ] Crear tabla `trainer_content_library` (SQL)
- [ ] Crear tabla `trainer_content_usage_logs` (SQL)
- [ ] Migrar contenido existente a biblioteca

## 📋 PRÓXIMOS PASOS

1. **Actualizar referencias 'edu' → 'jey'** (rápido, 15 min)
2. **Filtrar Carolina en componentes** (rápido, 10 min)
3. **Integrar RAG en chat** (medio, 1-2 horas)
4. **Crear tablas SQL** (rápido, 20 min)
5. **Probar sistema completo** (medio, 1 hora)

---

## NOTAS

- El sistema RAG está diseñado pero necesita integración en el flujo de chat
- El verificador de dieta está listo pero necesita integración con OpenAI
- Las funciones helper para filtrar entrenadores están creadas pero no se usan aún

