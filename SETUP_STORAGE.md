# Configuración de Supabase Storage

Para que la aplicación funcione correctamente, necesitas crear los buckets de almacenamiento en Supabase.

## ⚡ Solución Rápida (Solo progress-photos)

Si solo necesitas crear el bucket `progress-photos`:

1. Ve a https://supabase.com/dashboard y selecciona tu proyecto
2. Haz clic en **"SQL Editor"** en el menú lateral
3. Haz clic en **"New query"**
4. Copia y pega el contenido del archivo `create-progress-photos-bucket-only.sql`
5. Haz clic en **"Run"** (o presiona `Ctrl+Enter` / `Cmd+Enter`)
6. Verifica en **"Storage"** que el bucket `progress-photos` aparece

## 📋 Configuración Completa (Todos los buckets)

Para crear todos los buckets necesarios (avatars, progress-photos, posts):

1. **Abre tu proyecto en Supabase Dashboard**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre el SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - O ve directamente a: `https://supabase.com/dashboard/project/[TU_PROYECTO]/sql`

3. **Ejecuta el script de creación de buckets**
   - Haz clic en "New query"
   - Copia y pega el contenido completo del archivo `create-storage-buckets.sql`
   - Haz clic en "Run" o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)

4. **Verifica que los buckets se crearon**
   - Ve a "Storage" en el menú lateral
   - Deberías ver tres buckets:
     - `avatars`
     - `progress-photos`
     - `posts`

## Buckets que se crean

- **avatars**: Para las fotos de perfil de los usuarios
- **progress-photos**: Para las fotos de progreso de los usuarios
- **posts**: Para futuras publicaciones (aún no implementado)

## Políticas de seguridad

El script también crea las políticas RLS (Row Level Security) necesarias para que:
- Los usuarios solo puedan subir/editar/eliminar sus propias fotos
- Las fotos sean públicamente visibles (para que se puedan mostrar en la app)

## Solución de problemas

Si después de ejecutar el script sigues viendo el error:

1. **Verifica que el bucket existe:**
   - Ve a "Storage" en Supabase Dashboard
   - Deberías ver el bucket `progress-photos` en la lista
   - Si no aparece, ejecuta el script de nuevo

2. **Verifica las políticas RLS:**
   - En "Storage" → "progress-photos" → "Policies"
   - Deberías ver 4 políticas creadas

3. **Verifica que estás en el proyecto correcto:**
   - Asegúrate de que las variables de entorno `.env.local` apuntan al proyecto correcto
   - `NEXT_PUBLIC_SUPABASE_URL` debe coincidir con tu proyecto

4. **Recarga la aplicación:**
   - Cierra y vuelve a abrir el navegador
   - O haz un hard refresh: `Ctrl+Shift+R` (Windows) o `Cmd+Shift+R` (Mac)

5. **Si el error persiste:**
   - Abre la consola del navegador (F12) y revisa si hay más errores
   - Verifica que el bucket esté marcado como "Public" en Supabase

