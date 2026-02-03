import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/seo'

const baseUrl = getBaseUrl()

export const metadata: Metadata = {
  title: 'Preguntas frecuentes',
  description:
    'Preguntas frecuentes sobre GymRatIA: qué es un entrenador IA, cómo elegir entrenador, precios, cancelación, datos de salud y más. Respuestas claras para alumnos y entrenadores.',
  keywords: [
    'FAQ GymRatIA',
    'preguntas frecuentes',
    'entrenador IA',
    'cómo funciona',
    'precios',
    'cancelación',
  ],
  openGraph: {
    title: 'Preguntas frecuentes | GymRatIA',
    description:
      'Respuestas a las dudas más habituales sobre GymRatIA: entrenador IA, planes, precios y más.',
    url: `${baseUrl}/faq`,
  },
  alternates: { canonical: `${baseUrl}/faq` },
}

export default function FaqLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>
}
