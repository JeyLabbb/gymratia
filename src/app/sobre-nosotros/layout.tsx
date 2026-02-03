import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/seo'

const baseUrl = getBaseUrl()

export const metadata: Metadata = {
  title: 'Sobre nosotros',
  description:
    'GymRatIA es la plataforma que combina entrenadores IA personalizados con planes de entrenamiento y dieta adaptativos. Conoce nuestra misión, cómo trabajamos y por qué apostamos por la IA para el fitness.',
  keywords: [
    'GymRatIA',
    'sobre nosotros',
    'entrenador IA',
    'fitness',
    'plataforma entrenamiento',
  ],
  openGraph: {
    title: 'Sobre nosotros | GymRatIA',
    description:
      'Plataforma de entrenadores IA y planes personalizados. Nuestra misión y cómo trabajamos.',
    url: `${baseUrl}/sobre-nosotros`,
  },
  alternates: { canonical: `${baseUrl}/sobre-nosotros` },
}

export default function SobreNosotrosLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>
}
