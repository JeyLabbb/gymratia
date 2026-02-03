import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getTrainerBySlug } from '@/lib/personas'
import { getBaseUrl, SITE_NAME } from '@/lib/seo'

type Props = {
  params: Promise<{ slug: string }>
  children: React.ReactNode
}

async function getTrainerMeta(slug: string): Promise<{ name: string; description: string } | null> {
  const persona = getTrainerBySlug(slug)
  if (persona) {
    return {
      name: persona.name,
      description: `${persona.headline} ${persona.philosophy}`.slice(0, 155),
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const supabase = createClient(url, key)
    const { data } = await supabase
      .from('trainers')
      .select('trainer_name, description, philosophy')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()
    if (!data) return null
    const desc = [data.description, data.philosophy].filter(Boolean).join(' ').slice(0, 155)
    return {
      name: data.trainer_name,
      description: desc || 'Entrenador en GymRatIA. Planes personalizados y chat 24/7.',
    }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const trainer = await getTrainerMeta(slug)
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/trainers/${slug}`

  if (!trainer) {
    return {
      title: 'Entrenador no encontrado',
      description: 'El entrenador que buscas no está disponible en GymRatIA.',
      robots: { index: false, follow: true },
    }
  }

  const title = `${trainer.name} - Entrenador IA`
  const description =
    trainer.description ||
    `Entrenador ${trainer.name} en GymRatIA. Planes de entrenamiento y dieta personalizados, chat 24/7.`

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
    },
    alternates: { canonical: url },
  }
}

export default function TrainerSlugLayout({ children }: Props) {
  return <>{children}</>
}
