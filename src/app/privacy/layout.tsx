import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/seo'

const baseUrl = getBaseUrl()

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description:
    'Política de privacidad de GymRatIA. Cómo tratamos tus datos personales, derechos y contacto. Última actualización febrero 2026.',
  openGraph: {
    title: 'Política de Privacidad | GymRatIA',
    description:
      'Política de privacidad de GymRatIA. Cómo tratamos tus datos personales y tus derechos.',
    url: `${baseUrl}/privacy`,
  },
  alternates: { canonical: `${baseUrl}/privacy` },
}

export default function PrivacyLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>
}
