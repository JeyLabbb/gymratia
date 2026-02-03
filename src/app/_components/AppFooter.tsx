import Link from 'next/link'

export function AppFooter() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.08)] py-6 sm:py-8 md:py-10 bg-[#0A0A0B]" role="contentinfo">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-5 md:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
          <div>
            <h3 className="font-heading text-base md:text-lg font-bold mb-2 md:mb-4 text-[#F8FAFC]">Producto</h3>
            <ul className="space-y-1.5 md:space-y-2">
              <li>
                <Link href="/trainers" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-xs sm:text-sm transition-colors">
                  Entrenadores IA
                </Link>
              </li>
              <li>
                <Link href="/explore" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-xs sm:text-sm transition-colors">
                  Explorar
                </Link>
              </li>
              <li>
                <Link href="/como-funciona" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-xs sm:text-sm transition-colors">
                  Cómo funciona
                </Link>
              </li>
              <li>
                <Link href="/trainers/register" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-xs sm:text-sm transition-colors">
                  Registro entrenadores
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-xs sm:text-sm transition-colors">
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading text-base md:text-lg font-bold mb-2 md:mb-4 text-[#F8FAFC]">Información</h3>
            <ul className="space-y-1.5 md:space-y-2">
              <li>
                <Link href="/sobre-nosotros" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-xs sm:text-sm transition-colors">
                  Sobre nosotros
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-xs sm:text-sm transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading text-base md:text-lg font-bold mb-2 md:mb-4 text-[#F8FAFC]">Legal</h3>
            <ul className="space-y-1.5 md:space-y-2">
              <li>
                <Link href="/privacy" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-xs sm:text-sm transition-colors">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-xs sm:text-sm transition-colors">
                  Términos
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-heading text-base md:text-lg font-bold mb-2 md:mb-4 text-[#F8FAFC]">Contacto</h3>
            <ul className="space-y-1.5 md:space-y-2">
              <li>
                <a href="mailto:info@gymratia.com" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-xs sm:text-sm transition-colors break-all">
                  info@gymratia.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-4 sm:pt-6 md:pt-8 border-t border-[rgba(255,255,255,0.08)] text-center text-xs sm:text-sm text-[#7B8291]">
          © GymRatIA 2025. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
