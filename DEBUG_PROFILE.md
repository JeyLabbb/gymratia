# Debug: Error al guardar perfil

## Posibles causas:

1. **Tabla `user_profiles` no existe en Supabase**
   - Ve a Supabase Dashboard > SQL Editor
   - Ejecuta el script `supabase-schema.sql`
   - Verifica que la tabla `user_profiles` exista

2. **Variable de entorno `SUPABASE_SERVICE_ROLE_KEY` no configurada**
   - Verifica tu `.env.local`
   - Debe tener: `SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key`
   - Encuéntrala en: Supabase Dashboard > Settings > API > service_role key

3. **RLS bloqueando la inserción**
   - Verifica que las políticas RLS estén activas
   - Ejecuta el script `supabase-schema.sql` completo

4. **Token de autenticación inválido**
   - Verifica que el usuario esté autenticado
   - Revisa la consola del navegador para ver el token

## Para debuggear:

1. Abre la consola del navegador (F12)
2. Ve a la pestaña Network
3. Intenta guardar el perfil
4. Busca la request a `/api/user/profile`
5. Revisa:
   - Status code (debería ser 200)
   - Response body (verás el error específico)
   - Request headers (verifica que tenga Authorization)

## Verificar en Supabase:

1. Ve a Supabase Dashboard > Table Editor
2. Verifica que exista la tabla `user_profiles`
3. Verifica que tenga las columnas correctas:
   - id (UUID)
   - user_id (UUID)
   - full_name (TEXT)
   - email (TEXT)
   - height_cm (INTEGER)
   - weight_kg (NUMERIC)
   - goal (TEXT)
   - sex (TEXT)
   - created_at (TIMESTAMPTZ)
   - updated_at (TIMESTAMPTZ)

4. Ve a Authentication > Policies
5. Verifica que existan políticas para `user_profiles`:
   - "Users can view their own profile"
   - "Users can update their own profile"
   - "Users can insert their own profile"


