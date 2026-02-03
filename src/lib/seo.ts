/**
 * URL base canónica del sitio para SEO (Open Graph, canonical, sitemap).
 * En producción usar NEXT_PUBLIC_APP_URL o VERCEL_URL; en desarrollo localhost.
 */
export function getBaseUrl(): string {
  if (typeof process.env.NEXT_PUBLIC_APP_URL === 'string' && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  if (typeof process.env.VERCEL_URL === 'string' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'https://gymratia.com'
}

export const SITE_NAME = 'GymRatIA'
export const DEFAULT_DESCRIPTION =
  'Entrenadores IA personalizados, planes de entrenamiento y dieta adaptativos, y seguimiento de progreso. Tu entrenador personal 24/7.'
export const DEFAULT_TITLE = 'GymRatIA | Entrenador IA personalizado y planes adaptativos'
