import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Configura tu IA de entrenador | GymRatIA',
  description:
    'Configura tu entrenador virtual IA. Añade entrenamientos y dietas personalizados para tus alumnos. Crea contenido, gestiona tu metodología y haz crecer tu marca como entrenador.',
  openGraph: {
    title: 'Configura tu IA de entrenador | GymRatIA',
    description:
      'Configura tu entrenador virtual IA. Añade entrenamientos y dietas personalizados para tus alumnos.',
    url: 'https://www.gymratia.com/trainers/onboarding',
  },
}

export default function TrainerOnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
