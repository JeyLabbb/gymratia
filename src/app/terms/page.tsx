'use client'

import Link from 'next/link'

const TERMS_VERSION = '2026-02-02'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F8FAFC]">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-[#A7AFBE] hover:text-[#FF2D2D] mb-8"
        >
          ← Volver
        </Link>
        <h1 className="font-heading text-3xl font-bold mb-2">Términos y Condiciones</h1>
        <p className="text-[#7B8291] text-sm mb-8">Versión: {TERMS_VERSION}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-[#A7AFBE]">
          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">1. Identificación</h2>
            <p>
              Gymratia (la &quot;Aplicación&quot;) es una plataforma digital que ofrece herramientas de
              seguimiento de entrenamiento, nutrición y progreso, incluyendo funcionalidades basadas en
              inteligencia artificial (&quot;IA&quot;). Contacto: soporte@gymratia.com.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">2. Objeto</h2>
            <p>
              Estos Términos regulan el acceso y uso de la Aplicación. Al crear una cuenta o usar la
              Aplicación, aceptas estos Términos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">3. Edad mínima</h2>
            <p>
              Debes tener al menos 16 años (o la edad mínima legal aplicable en tu país) para usar la
              Aplicación. Si eres menor, necesitas autorización de tu representante legal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">4. Naturaleza del servicio y advertencia de salud</h2>
            <p>
              La información ofrecida (incluidas recomendaciones de IA o entrenadores) es general e
              informativa. La Aplicación no sustituye asesoramiento médico, nutricional o de un
              entrenador personal titulado, ni realiza diagnósticos. Si tienes una condición médica,
              lesión, dolor, síntomas relevantes o dudas de salud, consulta con un profesional sanitario
              antes de seguir recomendaciones.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">5. Responsabilidad del usuario</h2>
            <p>Eres responsable de:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>usar la Aplicación con prudencia y sentido común;</li>
              <li>introducir datos veraces y actualizados;</li>
              <li>adaptar cualquier recomendación a tu situación real.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">6. Limitación de responsabilidad</h2>
            <p>
              En la medida permitida por la ley, Gymratia no será responsable de: decisiones tomadas
              por el usuario basadas en la información de la App; lesiones, daños o perjuicios derivados
              del uso indebido o no supervisado; errores o inexactitudes generadas por IA, contenido de
              terceros o entrenadores.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">7. Cuentas, roles y seguridad</h2>
            <p>
              Eres responsable de mantener la confidencialidad de tus credenciales. Si detectas uso no
              autorizado, notifícalo de inmediato.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">8. Contenido de entrenadores y usuarios</h2>
            <p>
              Si eres entrenador o subes contenidos: declaras que tienes derecho a usar y compartir ese
              material; eres responsable de que sea lícito y no engañoso; Gymratia puede retirar
              contenidos o suspender cuentas ante incumplimientos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">9. Conducta prohibida</h2>
            <p>Queda prohibido: usar la App para actividades ilegales; suplantar identidades o manipular
              valoraciones; introducir contenido dañino, ofensivo o engañoso; intentar acceder a datos de
              otros usuarios sin permiso.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">10. Suscripciones y pagos (si aplica)</h2>
            <p>
              Si existen planes de pago, se informará del precio, periodicidad y condiciones de
              cancelación en el proceso de compra. Gymratia podrá modificar planes o precios
              notificándolo de forma razonable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">11. Privacidad y datos personales</h2>
            <p>
              El tratamiento de datos personales se regula en la Política de Privacidad (ideal: página
              separada /privacy). La App puede tratar datos relacionados con salud/fitness (peso, fotos de
              progreso, hábitos) si el usuario los aporta voluntariamente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">12. Propiedad intelectual</h2>
            <p>
              La Aplicación, su diseño, marcas, textos y software pertenecen a Gymratia o a sus
              licenciantes. No se concede licencia más allá del uso normal del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">13. Suspensión y terminación</h2>
            <p>
              Gymratia puede suspender o cerrar cuentas por incumplimiento de estos Términos o por
              motivos de seguridad. El usuario puede dejar de usar la App en cualquier momento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">14. Modificaciones</h2>
            <p>
              Gymratia puede actualizar estos Términos. Si el cambio es material, se notificará y podrá
              requerirse aceptación de la nueva versión.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">15. Legislación aplicable y jurisdicción</h2>
            <p>
              Estos Términos se rigen por la legislación española. Para cualquier conflicto, las partes
              se someten a los juzgados y tribunales que correspondan conforme a la normativa aplicable.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[rgba(255,255,255,0.08)]">
          <Link
            href="/"
            className="text-[#FF2D2D] hover:underline"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
