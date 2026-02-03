import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/seo'

const baseUrl = getBaseUrl()

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description:
    'Términos y condiciones de uso de GymRatIA. Reglas de uso, responsabilidad y aviso de salud. Versión febrero 2026.',
  openGraph: {
    title: 'Términos y Condiciones | GymRatIA',
    description:
      'Términos y condiciones de uso de GymRatIA. Reglas de uso y aviso de salud.',
    url: `${baseUrl}/terms`,
  },
  alternates: { canonical: `${baseUrl}/terms` },
}

export default function TermsLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>
}
