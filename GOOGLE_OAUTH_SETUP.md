# Configuración de Google OAuth para Supabase

## Paso 1: Crear Credenciales en Google Cloud Console

1. **Ve a Google Cloud Console:**
   - https://console.cloud.google.com/
   - Crea un nuevo proyecto o selecciona uno existente

2. **Habilita Google+ API:**
   - Ve a "APIs & Services" > "Library"
   - Busca "Google+ API" y habilítala

3. **Crea credenciales OAuth 2.0:**
   - Ve a "APIs & Services" > "Credentials"
   - Click en "Create Credentials" > "OAuth client ID"
   - Si es la primera vez, configura la pantalla de consentimiento OAuth:
     - Tipo de aplicación: "External" (o Internal si tienes Google Workspace)
     - Nombre de la app: "GymRatIA"
     - Email de soporte: tu email
     - Guarda y continúa

4. **Configura el OAuth Client:**
   - Tipo de aplicación: **"Web application"**
   - Nombre: "GymRatIA Web Client"
   - **Authorized JavaScript origins:**
     ```
     https://dwwuajvhashjwztwjmfu.supabase.co
     ```
   - **Authorized redirect URIs:**
     ```
     https://dwwuajvhashjwztwjmfu.supabase.co/auth/v1/callback
     ```

5. **Copia las credenciales:**
   - Te dará un **Client ID** (algo como: `123456789-abc...xyz.apps.googleusercontent.com`)
   - Te dará un **Client Secret** (algo como: `GOCSPX-abc...xyz`)

## Paso 2: Configurar en Supabase

1. **Ve a tu proyecto en Supabase:**
   - https://supabase.com/dashboard

2. **Ve a Authentication > Providers:**
   - En la lista de proveedores, encuentra "Google"
   - Click en el toggle para habilitarlo

3. **Ingresa las credenciales:**
   - **Client ID (Client ID for OAuth):**
     ```
     Pega aquí el Client ID que copiaste de Google Cloud Console
     Ejemplo: 123456789-abc...xyz.apps.googleusercontent.com
     ```
   
   - **Client Secret (Client Secret for OAuth):**
     ```
     Pega aquí el Client Secret que copiaste de Google Cloud Console
     Ejemplo: GOCSPX-abc...xyz
     ```

4. **Guarda los cambios**

## Paso 3: Verificar la Configuración

El callback URL que Supabase te muestra es:
```
https://dwwuajvhashjwztwjmfu.supabase.co/auth/v1/callback
```

**IMPORTANTE:** Este debe estar exactamente igual en:
- ✅ Google Cloud Console (Authorized redirect URIs)
- ✅ Supabase (se configura automáticamente, solo verifica)

## Resumen de URLs

- **Supabase Project URL:** `https://dwwuajvhashjwztwjmfu.supabase.co`
- **Callback URL:** `https://dwwuajvhashjwztwjmfu.supabase.co/auth/v1/callback`
- **Tu app callback:** `http://localhost:3000/auth/callback` (desarrollo) o `https://tu-dominio.com/auth/callback` (producción)

## Nota sobre el Callback en tu App

En tu código Next.js, el callback route está en:
- `src/app/auth/callback/route.ts`

Este route redirige a Supabase para intercambiar el código por una sesión, y luego redirige a `/dashboard`.

## Troubleshooting

Si tienes errores:

1. **"redirect_uri_mismatch":**
   - Verifica que la URL en Google Cloud Console sea exactamente: `https://dwwuajvhashjwztwjmfu.supabase.co/auth/v1/callback`

2. **"invalid_client":**
   - Verifica que el Client ID y Client Secret estén correctos en Supabase

3. **"access_denied":**
   - Verifica que la Google+ API esté habilitada en Google Cloud Console


