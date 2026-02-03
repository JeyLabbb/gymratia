import Link from 'next/link'
import { Target, Sparkles, Shield, Users, ArrowRight, Heart } from 'lucide-react'

export default function SobreNosotrosPage() {
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
            Sobre <span className="text-[#FF2D2D]">GymRatIA</span>
          </h1>
          <p className="text-lg text-[#A7AFBE] leading-relaxed">
            GymRatIA es la plataforma que une entrenadores basados en inteligencia artificial con planes de
            entrenamiento y nutrición personalizados. Nuestra misión es que cualquier persona pueda tener un
            entrenador que se adapte a su nivel, objetivo y tiempo, disponible 24/7.
          </p>
        </header>

        <section className="space-y-8 mb-12">
          <h2 className="font-heading text-xl md:text-2xl font-bold uppercase flex items-center gap-2">
            <Target className="w-6 h-6 text-[#FF2D2D]" />
            Nuestra misión
          </h2>
          <p className="text-[#A7AFBE] leading-relaxed">
            Queremos democratizar el acceso a un entrenamiento de calidad. No todo el mundo puede permitirse
            un entrenador personal humano a tiempo completo, pero sí puede tener una IA que conozca su perfil,
            le diseñe un plan coherente y le responda cuando tenga dudas. Por eso construimos GymRatIA: para
            que el entrenador virtual sea tan útil y personalizado como sea posible, sin inventar información
            y respetando la metodología de cada entrenador (humano o virtual) que forma parte de la plataforma.
          </p>

          <h2 className="font-heading text-xl md:text-2xl font-bold uppercase flex items-center gap-2 mt-10">
            <Sparkles className="w-6 h-6 text-[#FF2D2D]" />
            Por qué IA para el fitness
          </h2>
          <p className="text-[#A7AFBE] leading-relaxed">
            La inteligencia artificial nos permite ofrecer un acompañamiento continuo: el usuario no depende
            de un horario de consulta ni de la disponibilidad de una sola persona. La IA recuerda el contexto
            (objetivo, historial, preferencias) y puede adaptar recomendaciones en función del progreso. Además,
            los entrenadores reales pueden crear su propia IA con su metodología, de modo que sus alumnos
            tengan un “clon” virtual que habla como ellos y usa solo su contenido. Así combinamos lo mejor de
            la tecnología con la experiencia humana.
          </p>

          <h2 className="font-heading text-xl md:text-2xl font-bold uppercase flex items-center gap-2 mt-10">
            <Shield className="w-6 h-6 text-[#FF2D2D]" />
            Transparencia y aviso de salud
          </h2>
          <p className="text-[#A7AFBE] leading-relaxed">
            GymRatIA no sustituye a un médico, nutricionista titulado ni a un entrenador personal en vivo.
            Toda la información que ofrecemos (incluidas las respuestas de la IA) es de carácter general e
            informativo. Si tienes una condición médica, lesión o dudas de salud, debes consultar con un
            profesional sanitario antes de seguir cualquier plan. En nuestros términos y condiciones y en la
            app dejamos este aviso claro para que uses la plataforma con responsabilidad.
          </p>

          <h2 className="font-heading text-xl md:text-2xl font-bold uppercase flex items-center gap-2 mt-10">
            <Users className="w-6 h-6 text-[#FF2D2D]" />
            Para alumnos y para entrenadores
          </h2>
          <p className="text-[#A7AFBE] leading-relaxed">
            La plataforma tiene dos perfiles: el de alumno (persona que entrena con un entrenador IA o con un
            entrenador real) y el de entrenador (profesional que crea su IA y gestiona a sus alumnos). Los
            alumnos eligen entrenador, responden un cuestionario y reciben plan y chat. Los entrenadores
            configuran su metodología, suben contenido y pueden tener un perfil público para que los alumnos
            los encuentren. Todo está pensado para que la experiencia sea clara y útil para ambos.
          </p>

          <h2 className="font-heading text-xl md:text-2xl font-bold uppercase flex items-center gap-2 mt-10">
            <Heart className="w-6 h-6 text-[#FF2D2D]" />
            Contacto
          </h2>
          <p className="text-[#A7AFBE] leading-relaxed">
            Si quieres saber más sobre GymRatIA, proponer una colaboración o reportar un problema, puedes
            escribirnos a <a href="mailto:info@gymratia.com" className="text-[#FF2D2D] hover:underline">info@gymratia.com</a> o
            <a href="mailto:soporte@gymratia.com" className="text-[#FF2D2D] hover:underline ml-1">soporte@gymratia.com</a>.
            Te responderemos lo antes posible.
          </p>
        </section>

        <nav className="pt-8 border-t border-[rgba(255,255,255,0.08)] flex flex-wrap gap-6">
          <Link href="/como-funciona" className="text-[#FF2D2D] hover:underline">
            Cómo funciona
          </Link>
          <Link href="/faq" className="text-[#FF2D2D] hover:underline">
            Preguntas frecuentes
          </Link>
          <Link href="/trainers" className="text-[#FF2D2D] hover:underline">
            Ver entrenadores
          </Link>
          <Link href="/" className="text-[#A7AFBE] hover:text-[#FF2D2D] hover:underline">
            Ir al inicio
          </Link>
        </nav>
      </div>
    </div>
  )
}
