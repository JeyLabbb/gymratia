import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/seo'

const baseUrl = getBaseUrl()

export const metadata: Metadata = {
  title: 'Entrenadores IA',
  description:
    'Elige tu entrenador IA en GymRatIA. Entrenadores virtuales con estilos únicos: planes personalizados por bloques, chat 24/7, dieta y seguimiento. Jey, Carolina, Edu y más.',
  keywords: [
    'entrenador IA',
    'entrenador virtual',
    'plan entrenamiento',
    'Jey',
    'GymRatIA entrenadores',
  ],
  openGraph: {
    title: 'Entrenadores IA | GymRatIA',
    description:
      'Elige tu entrenador IA. Planes personalizados, chat 24/7 y seguimiento. Jey, Carolina, Edu y más.',
    url: `${baseUrl}/trainers`,
  },
  alternates: { canonical: `${baseUrl}/trainers` },
}

export default function TrainersLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>
}
