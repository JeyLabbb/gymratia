# Portal Gymratia - Variables de entorno

Añade estas variables en `.env.local` (local) y en Vercel → Project → Settings → Environment Variables (producción):

```
ADMIN_EMAIL=tu-email@ejemplo.com
ADMIN_PASSWORD=tu-contraseña-segura
ADMIN_SESSION_SECRET=una-cadena-de-al-menos-32-caracteres-aleatorios
```

- **ADMIN_EMAIL** / **ADMIN_PASSWORD**: Credenciales para acceder al portal en `/portal`
- **ADMIN_SESSION_SECRET**: Se usa para firmar la cookie de sesión. Debe tener al menos 32 caracteres. En desarrollo, si no está definido, se usa un valor por defecto (solo para pruebas locales).
