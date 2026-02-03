import Link from 'next/link'
import {
  UserPlus,
  MessageSquare,
  ClipboardList,
  Target,
  Salad,
  Dumbbell,
  ArrowRight,
  Sparkles,
  Calendar,
} from 'lucide-react'

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F8FAFC]">
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <nav className="mb-8" aria-label="Breadcrumb">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#A7AFBE] hover:text-[#FF2D2D] transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Volver al inicio
          </Link>
        </nav>

        <header className="mb-12">
          <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-4">
            Cómo funciona <span className="text-[#FF2D2D]">GymRatIA</span>
          </h1>
          <p className="text-lg text-[#A7AFBE] leading-relaxed">
            En pocos minutos tienes un entrenador personal basado en IA que te conoce, te diseña un plan a tu medida
            y te acompaña 24/7. Sin compromisos de permanencia: tú eliges cuándo empezar y con qué estilo de entrenamiento.
          </p>
        </header>

        <ol className="space-y-10" role="list">
          <li className="relative pl-10 border-l-2 border-[#FF2D2D]/30 border-solid">
            <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#FF2D2D]" aria-hidden="true" />
            <h2 className="font-heading text-xl md:text-2xl font-bold uppercase mb-2 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-[#FF2D2D]" />
              1. Elige tu entrenador IA
            </h2>
            <p className="text-[#A7AFBE] mb-3">
              En GymRatIA hay varios entrenadores virtuales, cada uno con su filosofía e intensidad. Puedes elegir
              uno más exigente, otro más flexible, o uno que se adapte a tu nivel. También hay entrenadores reales
              que han creado su propia IA con su metodología.
            </p>
            <Link
              href="/trainers"
              className="inline-flex items-center gap-2 text-[#FF2D2D] font-semibold hover:underline"
            >
              Ver todos los entrenadores
              <ArrowRight className="w-4 h-4" />
            </Link>
          </li>

          <li className="relative pl-10 border-l-2 border-[#FF2D2D]/30 border-solid">
            <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#FF2D2D]" aria-hidden="true" />
            <h2 className="font-heading text-xl md:text-2xl font-bold uppercase mb-2 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-[#FF2D2D]" />
              2. Responde el cuestionario
            </h2>
            <p className="text-[#A7AFBE] mb-3">
              Cuando eliges un entrenador, un breve cuestionario recoge tu objetivo, experiencia, días disponibles
              y preferencias. Con eso la IA diseña un plan pensado para ti: no es un plan genérico, sino adaptado
              a tu situación real.
            </p>
          </li>

          <li className="relative pl-10 border-l-2 border-[#FF2D2D]/30 border-solid">
            <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#FF2D2D]" aria-hidden="true" />
            <h2 className="font-heading text-xl md:text-2xl font-bold uppercase mb-2 flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-[#FF2D2D]" />
              3. Recibe tu plan de entrenamiento
            </h2>
            <p className="text-[#A7AFBE] mb-3">
              Tu entrenador IA te entrega un bloque de entrenamientos por semanas: ejercicios, series, repeticiones
              y progresión. La duración del bloque depende del entrenador que hayas elegido (semanas definidas por
              su metodología). Todo dentro de la app, ordenado por días.
            </p>
          </li>

          <li className="relative pl-10 border-l-2 border-[#FF2D2D]/30 border-solid">
            <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#FF2D2D]" aria-hidden="true" />
            <h2 className="font-heading text-xl md:text-2xl font-bold uppercase mb-2 flex items-center gap-2">
              <Salad className="w-6 h-6 text-[#FF2D2D]" />
              4. Dieta y nutrición
            </h2>
            <p className="text-[#A7AFBE] mb-3">
              Además del entrenamiento, puedes recibir orientación nutricional y planes de comida adaptados a tu
              objetivo (volumen, definición, mantenimiento). La IA usa solo el material y criterios del entrenador
              que elegiste, sin inventar información.
            </p>
          </li>

          <li className="relative pl-10 border-l-2 border-[#FF2D2D]/30 border-solid">
            <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#FF2D2D]" aria-hidden="true" />
            <h2 className="font-heading text-xl md:text-2xl font-bold uppercase mb-2 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-[#FF2D2D]" />
              5. Chat 24/7 con tu entrenador IA
            </h2>
            <p className="text-[#A7AFBE] mb-3">
              Puedes hablar con tu entrenador virtual cuando quieras: preguntas sobre ejercicios, pedir cambios
              en el plan, contar cómo ha ido el entrenamiento o ajustar la dieta. La IA recuerda tu contexto y
              te responde en función de tu perfil y de lo que ya has hecho.
            </p>
          </li>

          <li className="relative pl-10 border-l-2 border-[#FF2D2D]/30 border-solid">
            <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#FF2D2D]" aria-hidden="true" />
            <h2 className="font-heading text-xl md:text-2xl font-bold uppercase mb-2 flex items-center gap-2">
              <Target className="w-6 h-6 text-[#FF2D2D]" />
              6. Seguimiento de progreso
            </h2>
            <p className="text-[#A7AFBE] mb-3">
              Registra peso, fotos de progreso y logs de entrenamiento. Así tu entrenador IA puede sugerir
              ajustes y tú ves tu evolución en gráficas y calendario. Todo queda en tu perfil dentro de la app.
            </p>
          </li>
        </ol>

        <section className="mt-14 p-6 rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)]">
          <h2 className="font-heading text-xl font-bold uppercase mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FF2D2D]" />
            Resumen
          </h2>
          <p className="text-[#A7AFBE] mb-4">
            GymRatIA une entrenador IA, plan personalizado, dieta y seguimiento en una sola aplicación. Eliges
            entrenador, respondes un cuestionario, recibes tu plan y hablas por chat cuando lo necesites. La
            duración de cada bloque de entrenamiento depende del entrenador que escojas.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/trainers"
              className="inline-flex items-center gap-2 rounded-[16px] bg-[#FF2D2D] px-6 py-3 font-semibold text-white hover:bg-[#FF3D3D] transition-colors"
            >
              Elegir entrenador
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-[16px] border border-[rgba(255,255,255,0.2)] px-6 py-3 font-medium text-[#F8FAFC] hover:bg-[#14161B] transition-colors"
            >
              Ir al inicio
            </Link>
          </div>
        </section>

        <nav className="mt-10 pt-8 border-t border-[rgba(255,255,255,0.08)] flex flex-wrap gap-6">
          <Link href="/sobre-nosotros" className="text-[#FF2D2D] hover:underline">
            Sobre nosotros
          </Link>
          <Link href="/faq" className="text-[#FF2D2D] hover:underline">
            Preguntas frecuentes
          </Link>
          <Link href="/privacy" className="text-[#A7AFBE] hover:text-[#FF2D2D] hover:underline">
            Privacidad
          </Link>
          <Link href="/terms" className="text-[#A7AFBE] hover:text-[#FF2D2D] hover:underline">
            Términos
          </Link>
        </nav>
      </div>
    </div>
  )
}
