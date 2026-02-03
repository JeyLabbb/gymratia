import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/seo'

const baseUrl = getBaseUrl()

export const metadata: Metadata = {
  title: 'Explorar publicaciones',
  description:
    'Explora las publicaciones de la comunidad GymRatIA: progreso, rutinas, consejos de entrenamiento y nutrición compartidos por alumnos y entrenadores. Descubre contenido real y únete a la conversación.',
  keywords: [
    'Explorar GymRatIA',
    'publicaciones fitness',
    'comunidad entrenamiento',
    'progreso gym',
    'consejos entrenamiento',
  ],
  openGraph: {
    title: 'Explorar publicaciones | GymRatIA',
    description:
      'Publicaciones de la comunidad GymRatIA: progreso, rutinas y consejos de entrenamiento y nutrición.',
    url: `${baseUrl}/explore`,
  },
  alternates: { canonical: `${baseUrl}/explore` },
  robots: { index: true, follow: true },
}

export default function ExploreLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>
}
