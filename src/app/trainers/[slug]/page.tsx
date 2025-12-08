import Link from 'next/link'

import { personas } from '@/lib/personas'
import { GeneratePlanButton } from './GeneratePlanButton'

export const metadata = { title: 'Ficha del entrenador | GymRatIA' }

export default async function TrainerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const coach = personas.find((c) => c.slug === slug)
  if (!coach) return <div className="mx-auto max-w-3xl px-4 py-12">Entrenador no encontrado.</div>

  let configureHref: string | null = null
  let configureLabel: string | null = null

  if (coach.slug === 'edu') {
    configureHref = '/trainers/edu/configure'
    configureLabel = 'Configurar con Edu'
  } else if (coach.slug === 'carolina') {
    configureHref = '/trainers/carolina/configure'
    configureLabel = 'Configurar con Carolina'
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{coach.name}</h1>
      <p className="mt-2 text-slate-600">{coach.headline}</p>
      <p className="mt-4 text-slate-700 whitespace-pre-line">{coach.philosophy}</p>
      <div className="mt-8 flex gap-3">
        <a href="/onboarding/basic" className="rounded-[1.25rem] border px-5 py-3">
          Volver
        </a>
        <a href="/trainers" className="rounded-[1.25rem] border px-5 py-3">
          Ver todos
        </a>
        {configureHref && configureLabel && (
          <Link href={configureHref} className="rounded-[1.25rem] border px-5 py-3 text-[#007AFF]">
            {configureLabel}
          </Link>
        )}
        <GeneratePlanButton slug={coach.slug} />
      </div>
    </div>
  )
}
