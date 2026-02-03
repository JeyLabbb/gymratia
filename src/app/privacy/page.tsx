'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F8FAFC]">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-[#A7AFBE] hover:text-[#FF2D2D] mb-8"
        >
          ← Volver
        </Link>
        <h1 className="font-heading text-3xl font-bold mb-2">Política de Privacidad</h1>
        <p className="text-[#7B8291] text-sm mb-8">Última actualización: febrero 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-[#A7AFBE]">
          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">1. Responsable del tratamiento</h2>
            <p>
              El responsable del tratamiento de tus datos personales es Gymratia. Puedes contactarnos en
              soporte@gymratia.com o info@gymratia.com para ejercer tus derechos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">2. Datos que recogemos</h2>
            <p>
              Recogemos datos que nos proporcionas directamente al registrarte y usar la aplicación: nombre,
              email, datos de perfil (altura, peso, objetivos), fotos de progreso si las subes, registros de
              entrenamiento y dieta. También datos técnicos de uso (logs, cookies) para el funcionamiento del
              servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">3. Finalidad del tratamiento</h2>
            <p>
              Utilizamos tus datos para prestar el servicio (entrenador IA, planes, seguimiento), mejorar la
              experiencia, comunicarnos contigo y cumplir obligaciones legales. No vendemos tus datos a terceros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">4. Base legal</h2>
            <p>
              El tratamiento se basa en la ejecución del contrato (uso del servicio), tu consentimiento (cuando
              aplique) y el interés legítimo de Gymratia para mejorar el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">5. Conservación</h2>
            <p>
              Conservamos tus datos mientras mantengas la cuenta activa y durante los plazos necesarios para
              cumplir obligaciones legales. Puedes solicitar la eliminación en cualquier momento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">6. Tus derechos</h2>
            <p>
              Tienes derecho a acceder, rectificar, suprimir, limitar el tratamiento, portabilidad y oposición.
              Puedes presentar reclamación ante la autoridad de control competente (AEPD en España).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">7. Seguridad</h2>
            <p>
              Aplicamos medidas técnicas y organizativas para proteger tus datos frente a accesos no
              autorizados, pérdida o alteración.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">8. Cambios</h2>
            <p>
              Podemos actualizar esta política. Te notificaremos de cambios relevantes. El uso continuado
              tras las modificaciones implica aceptación.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[rgba(255,255,255,0.08)] flex gap-6">
          <Link href="/terms" className="text-[#FF2D2D] hover:underline">
            Ver Términos y Condiciones
          </Link>
          <Link href="/" className="text-[#FF2D2D] hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
