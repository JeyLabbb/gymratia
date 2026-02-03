import Link from 'next/link'

export function AppFooter() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.08)] py-10 bg-[#0A0A0B]">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-heading text-lg font-bold mb-4 text-[#F8FAFC]">Producto</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/onboarding/basic" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-sm transition-colors">
                  Onboarding
                </Link>
              </li>
              <li>
                <Link href="/trainers" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-sm transition-colors">
                  Entrenadores
                </Link>
              </li>
              <li>
                <Link href="/explore" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-sm transition-colors">
                  Explorar
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold mb-4 text-[#F8FAFC]">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-sm transition-colors">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-sm transition-colors">
                  Términos
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold mb-4 text-[#F8FAFC]">Contacto</h3>
            <ul className="space-y-2">
              <li>
                <a href="mailto:info@gymratia.com" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-sm transition-colors">
                  Email
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-[rgba(255,255,255,0.08)] text-center text-sm text-[#7B8291]">
          © GymRatIA 2025. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
