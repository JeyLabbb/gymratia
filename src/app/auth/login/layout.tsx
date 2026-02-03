import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/seo'

const baseUrl = getBaseUrl()

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description:
    'Accede a tu cuenta de GymRatIA. Inicia sesión con email o Google para continuar con tu entrenador IA y planes personalizados.',
  openGraph: {
    title: 'Iniciar sesión | GymRatIA',
    description:
      'Accede a tu cuenta de GymRatIA. Inicia sesión con email o Google para continuar con tu entrenador IA.',
    url: `${baseUrl}/auth/login`,
  },
  robots: { index: false, follow: true },
}

export default function LoginLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>
}
