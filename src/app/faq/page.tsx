import Link from 'next/link'
import { getBaseUrl } from '@/lib/seo'
import { HelpCircle, ArrowRight } from 'lucide-react'

const FAQ_ITEMS = [
  {
    question: '¿Qué es un entrenador IA en GymRatIA?',
    answer:
      'Un entrenador IA es un asistente virtual que conoce tu perfil (objetivo, experiencia, días disponibles) y te diseña planes de entrenamiento y nutrición personalizados. Puedes hablar con él por chat 24/7 para preguntas, cambios en el plan o seguimiento. La IA usa solo el material y la metodología del entrenador que elegiste, sin inventar información.',
  },
  {
    question: '¿Cómo elijo mi entrenador?',
    answer:
      'En la sección Entrenadores puedes ver todos los entrenadores disponibles: algunos son IAs con estilos distintos (más exigentes, más flexibles) y otros son entrenadores reales que han creado su IA con su metodología. Cada uno tiene una descripción, filosofía e intensidad. Elige el que más se ajuste a ti y empieza el cuestionario.',
  },
  {
    question: '¿Cuánto dura el plan de entrenamiento?',
    answer:
      'La duración del bloque de entrenamiento depende del entrenador que elijas. Cada entrenador define su metodología (por ejemplo, bloques de varias semanas). Cuando completes el cuestionario, recibirás un plan con la estructura que ese entrenador utiliza. Puedes pedir ajustes o un nuevo bloque más adelante por chat.',
  },
  {
    question: '¿GymRatIA sustituye a un médico o nutricionista?',
    answer:
      'No. GymRatIA no sustituye a un médico, nutricionista titulado ni a un entrenador personal en vivo. Toda la información (incluidas las respuestas de la IA) es general e informativa. Si tienes una condición médica, lesión o dudas de salud, debes consultar con un profesional sanitario antes de seguir cualquier plan.',
  },
  {
    question: '¿Puedo cambiar de entrenador?',
    answer:
      'Sí. Puedes trabajar con más de un entrenador o cambiar cuando quieras. Cada uno tiene su propio chat y su plan. Si cambias, tendrás que hacer el cuestionario del nuevo entrenador para recibir un plan adaptado a su metodología.',
  },
  {
    question: '¿Cómo cancelo o cambio mi suscripción?',
    answer:
      'Si tienes una suscripción de pago, puedes gestionarla desde la configuración de tu cuenta o desde el método de pago que uses (por ejemplo, en tu cuenta de Google o Apple). Para dudas concretas sobre facturación o cancelación, escríbenos a soporte@gymratia.com.',
  },
  {
    question: '¿Mis datos de salud están seguros?',
    answer:
      'Tratamos tus datos según nuestra Política de Privacidad. Los datos que introduces (peso, fotos de progreso, entrenamientos) se usan para darte el servicio y mejorar tu experiencia. No vendemos tus datos a terceros. Puedes ejercer tus derechos (acceso, rectificación, eliminación) contactando con nosotros.',
  },
  {
    question: 'Soy entrenador, ¿cómo me registro en GymRatIA?',
    answer:
      'Puedes registrarte como entrenador desde la opción "Empezar como entrenador" en la página principal o desde la sección de registro de entrenadores. Crearás tu perfil, subirás tu metodología y contenido, y podrás tener una IA que atienda a tus alumnos 24/7. Consulta la sección Cómo funciona para más detalles.',
  },
  {
    question: '¿Puedo ver publicaciones de la comunidad sin tener cuenta?',
    answer:
      'La sección Explorar muestra publicaciones de usuarios y entrenadores de GymRatIA. Algunas publicaciones son visibles de forma pública para que puedas ver el tipo de contenido que se comparte. Para publicar, dar like o comentar necesitas una cuenta.',
  },
]

function FaqJsonLd() {
  const baseUrl = getBaseUrl()
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F8FAFC]">
      <FaqJsonLd />
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
          <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-4 flex items-center gap-3">
            <HelpCircle className="w-10 h-10 text-[#FF2D2D]" />
            Preguntas frecuentes
          </h1>
          <p className="text-lg text-[#A7AFBE] leading-relaxed">
            Respuestas a las dudas más habituales sobre GymRatIA: entrenador IA, planes, precios, datos y más.
          </p>
        </header>

        <section className="space-y-6" aria-label="Listado de preguntas frecuentes">
          {FAQ_ITEMS.map((item, index) => (
            <article
              key={index}
              className="rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-6"
              itemScope
              itemType="https://schema.org/Question"
            >
              <h2 className="font-heading text-lg font-bold uppercase mb-3 text-[#F8FAFC]" itemProp="name">
                {item.question}
              </h2>
              <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                <p className="text-[#A7AFBE] leading-relaxed" itemProp="text">
                  {item.answer}
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-12 p-6 rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)]">
          <h2 className="font-heading text-lg font-bold uppercase mb-3">¿No encuentras tu respuesta?</h2>
          <p className="text-[#A7AFBE] mb-4">
            Escribe a <a href="mailto:soporte@gymratia.com" className="text-[#FF2D2D] hover:underline">soporte@gymratia.com</a> o
            <a href="mailto:info@gymratia.com" className="text-[#FF2D2D] hover:underline ml-1">info@gymratia.com</a> y
            te responderemos lo antes posible.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/como-funciona"
              className="inline-flex items-center gap-2 rounded-[16px] bg-[#FF2D2D] px-6 py-3 font-semibold text-white hover:bg-[#FF3D3D] transition-colors"
            >
              Cómo funciona
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/trainers"
              className="inline-flex items-center gap-2 rounded-[16px] border border-[rgba(255,255,255,0.2)] px-6 py-3 font-medium text-[#F8FAFC] hover:bg-[#14161B] transition-colors"
            >
              Ver entrenadores
            </Link>
          </div>
        </section>

        <nav className="mt-10 pt-8 border-t border-[rgba(255,255,255,0.08)] flex flex-wrap gap-6">
          <Link href="/como-funciona" className="text-[#FF2D2D] hover:underline">
            Cómo funciona
          </Link>
          <Link href="/sobre-nosotros" className="text-[#FF2D2D] hover:underline">
            Sobre nosotros
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
