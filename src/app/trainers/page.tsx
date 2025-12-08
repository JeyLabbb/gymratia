'use client'

import { personas } from '@/lib/personas'
import Link from 'next/link'
import { ArrowRight, Sparkles, Target } from 'lucide-react'

export default function Trainers() {
  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl md:text-5xl font-black uppercase text-[#F8FAFC] mb-4">
            ELIGE TU <span className="text-[#FF2D2D]">ENTRENADOR</span>
          </h1>
          <p className="text-lg text-[#A7AFBE] max-w-2xl mx-auto">
            Cada entrenador tiene su propio estilo y filosofía. Elige el que mejor se adapte a tus objetivos.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {personas.map((trainer) => (
            <Link
              key={trainer.slug}
              href={`/dashboard/chat/${trainer.slug}`}
              className="group block bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-8 hover:border-[#FF2D2D]/50 transition-all hover:shadow-[0_0_40px_rgba(255,45,45,0.15)]"
            >
              <div className="flex items-start gap-6 mb-6">
                <div className="w-20 h-20 rounded-full bg-[#FF2D2D] flex items-center justify-center text-white font-heading font-bold text-3xl flex-shrink-0">
                  {trainer.name[0]}
                </div>
                <div className="flex-1">
                  <h2 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-2">
                    {trainer.name}
                  </h2>
                  <p className="text-[#FF2D2D] font-medium mb-3">{trainer.headline}</p>
                  <p className="text-sm text-[#A7AFBE] leading-relaxed">{trainer.philosophy}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-[#FF2D2D]" />
                    <span className="text-xs text-[#A7AFBE] uppercase tracking-wide">Intensidad</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-2xl font-bold text-[#F8FAFC]">{trainer.intensity}</span>
                    <span className="text-sm text-[#7B8291]">/10</span>
                  </div>
                </div>
                <div className="bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-[#FF2D2D]" />
                    <span className="text-xs text-[#A7AFBE] uppercase tracking-wide">Flexibilidad</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-2xl font-bold text-[#F8FAFC]">{trainer.flexibility}</span>
                    <span className="text-sm text-[#7B8291]">/10</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.08)]">
                <span className="text-sm text-[#A7AFBE]">
                  Plan de {trainer.cycle_weeks} semanas
                </span>
                <div className="flex items-center gap-2 text-[#FF2D2D] group-hover:gap-3 transition-all">
                  <span className="font-medium">Configurar</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
