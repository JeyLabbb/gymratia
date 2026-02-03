import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/seo'

const baseUrl = getBaseUrl()

export const metadata: Metadata = {
  title: 'Cómo funciona GymRatIA',
  description:
    'Descubre cómo funciona GymRatIA: elige tu entrenador IA, responde el cuestionario, recibe tu plan personalizado y entrena con chat 24/7. Entrenamientos, dieta y seguimiento en una sola app.',
  keywords: [
    'cómo funciona GymRatIA',
    'entrenador IA',
    'plan personalizado',
    'cuestionario entrenamiento',
    'app fitness',
  ],
  openGraph: {
    title: 'Cómo funciona GymRatIA | Entrenador IA y planes personalizados',
    description:
      'Elige entrenador IA, responde el cuestionario, recibe tu plan y entrena con chat 24/7. Todo en una app.',
    url: `${baseUrl}/como-funciona`,
  },
  alternates: { canonical: `${baseUrl}/como-funciona` },
}

export default function ComoFuncionaLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>
}
