'use client'

import Link from 'next/link'
import { personas } from '@/lib/personas'
import { 
  Calendar, 
  Users, 
  Sparkles, 
  Target, 
  Salad, 
  Clipboard, 
  MessageCircle, 
  Dumbbell,
  ArrowRight,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import SafeImage from './_components/SafeImage'
import HeroBackgroundVideo from './_components/HeroBackgroundVideo'
import { StartButton } from './_components/StartButton'
import { PersonalizedHero } from './_components/PersonalizedHero'
import { PersonalizedNavbar } from './_components/PersonalizedNavbar'
import { EpicHomeAuthenticated } from './_components/EpicHomeAuthenticated'
import { useAuth } from './_components/AuthProvider'

// Utility components
function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto max-w-[1200px] px-5 md:px-8', className)}>
      {children}
    </div>
  )
}

function Button({ 
  children, 
  href, 
  variant = 'accentSolid', 
  size = 'md',
  className,
  ...props 
}: { 
  children: React.ReactNode
  href?: string
  variant?: 'accentSolid' | 'ghost' | 'accentOutline'
  size?: 'md' | 'xl'
  className?: string
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const baseStyles = 'inline-flex items-center justify-center rounded-[16px] font-medium transition-all'
  const variants = {
    accentSolid: 'bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] shadow-[0_0_40px_rgba(255,45,45,0.25)]',
    ghost: 'text-[#F8FAFC] hover:bg-[#14161B] border border-[rgba(255,255,255,0.08)]',
    accentOutline: 'text-[#FF2D2D] border border-[#FF2D2D] hover:bg-[rgba(255,45,45,0.12)]'
  }
  const sizes = {
    md: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  }

  const classes = cn(baseStyles, variants[variant], sizes[size], className)
  
  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
        {variant === 'accentSolid' && size === 'xl' && (
          <ArrowRight className="ml-2 h-5 w-5" />
        )}
      </Link>
    )
  }
  
  return <a className={classes} {...props}>{children}</a>
}

function Card({ 
  children, 
  variant = 'surface',
  className 
}: { 
  children: React.ReactNode
  variant?: 'surface' | 'surfaceAccentOutline' | 'outlineAccent' | 'darkTile' | 'accentTile'
  className?: string 
}) {
  const variants = {
    surface: 'bg-[#14161B] border border-[rgba(255,255,255,0.08)]',
    surfaceAccentOutline: 'bg-[#14161B] border border-[#FF2D2D]',
    outlineAccent: 'bg-transparent border border-[rgba(255,45,45,0.3)] hover:border-[#FF2D2D]',
    darkTile: 'bg-[#1A1D24] border border-[rgba(255,255,255,0.08)]',
    accentTile: 'bg-[#1A1D24] border border-[#FF2D2D]'
  }
  return (
    <div className={cn('rounded-[22px] p-6 transition-all', variants[variant], className)}>
      {children}
    </div>
  )
}

// Navbar is now PersonalizedNavbar component

// Hero Section
function Hero() {
  return (
    <section className="relative min-h-[100vh] md:min-h-[95vh] flex items-center overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <HeroBackgroundVideo src="/videos/mice.mp4" />
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        {/* Bottom fade so video blends into page */}
        <div className="absolute bottom-0 left-0 right-0 h-48 md:h-64 bg-gradient-to-b from-transparent to-[#0A0A0B] pointer-events-none" />
      </div>
      
      <Container className="relative z-10 grid md:grid-cols-2 gap-8 items-center pt-20 pb-32 md:pb-40">
        <PersonalizedHero />
        <div className="flex flex-wrap gap-6 pt-8">
          <div className="flex flex-col">
            <span className="text-2xl font-heading font-bold text-[#FF2D2D]">9</span>
            <span className="text-sm text-[#A7AFBE]">semanas</span>
            <span className="text-xs text-[#7B8291] mt-1">Plan completo</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-heading font-bold text-[#F8FAFC]">2</span>
            <span className="text-sm text-[#A7AFBE]">coaches</span>
            <span className="text-xs text-[#7B8291] mt-1">Con estilos únicos</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-heading font-bold text-[#F8FAFC]">PPL</span>
            <span className="text-xs text-[#7B8291] mt-1">Culturismo + salud</span>
          </div>
        </div>
      </Container>
    </section>
  )
}

// Why Choose Us Section
function WhyChooseUs() {
  const features = [
    {
      title: 'PLAN 9 SEMANAS',
      text: 'Progresión real semana a semana, sin improvisar.',
      icon: Calendar,
    },
    {
      title: 'COACHES CON PERSONALIDAD',
      text: 'Edu (culturismo intenso) y Carolina (salud/metabolismo).',
      icon: Users,
    },
    {
      title: 'IA + ESTRUCTURA REAL',
      text: 'Chat libre + datos objetivos para adaptar ejercicios.',
      icon: Sparkles,
    },
    {
      title: '100% ADAPTADO A TI',
      text: 'Tus días disponibles, gustos y limitaciones mandan.',
      icon: Target,
    },
  ]

  return (
    <section className="py-[72px]">
      <Container>
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-black uppercase mb-4">
            POR QUÉ <span className="text-[#FF2D2D]">ELEGIRNOS</span>
          </h2>
          <p className="text-[#A7AFBE] text-lg">No es otro PDF genérico. Es un plan que te entiende.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <Card key={idx} variant="outlineAccent" className="text-center">
                <Icon className="h-8 w-8 text-[#FF2D2D] mx-auto mb-4" />
                <h3 className="font-heading text-lg font-bold mb-2 uppercase">{feature.title}</h3>
                <p className="text-sm text-[#A7AFBE]">{feature.text}</p>
              </Card>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

// Trainers Preview Section
function TrainersPreview() {
  const trainers = personas.slice(0, 2)
  
  return (
    <section className="py-[72px]">
      <Container>
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-black uppercase mb-4">
            NUESTROS <span className="text-[#FF2D2D]">ENTRENADORES</span>
          </h2>
          <p className="text-[#A7AFBE] text-lg">Elige el estilo que mejor encaje contigo.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
          {trainers.map((trainer) => (
            <Card key={trainer.slug} variant="surface" className="text-center">
              <div className="w-24 h-24 rounded-full bg-[#1A1D24] mx-auto mb-4 flex items-center justify-center text-3xl font-heading">
                {trainer.name[0]}
              </div>
              <h3 className="font-heading text-2xl font-bold mb-2">{trainer.name}</h3>
              <p className="text-[#FF2D2D] text-sm mb-4">{trainer.headline}</p>
              <div className="flex justify-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[#FF2D2D] text-[#FF2D2D]" />
                ))}
              </div>
              <Button 
                href={`/trainers/${trainer.slug}/configure`} 
                variant="accentSolid" 
                size="md"
                className="w-full"
              >
                Configurar con {trainer.name}
              </Button>
            </Card>
          ))}
        </div>
        <div className="text-center">
          <Button href="/trainers" variant="accentOutline" size="md">
            Ver todos los entrenadores
          </Button>
        </div>
      </Container>
    </section>
  )
}

// Services Tiles Section
function ServicesTiles() {
  const services = [
    {
      title: 'DIETARY RX',
      text: 'Recomendaciones nutricionales según tu objetivo.',
      icon: Salad,
    },
    {
      title: 'PROGRAMAS',
      text: 'Métodos de entrenamiento claros y progresivos.',
      icon: Clipboard,
    },
    {
      title: 'COACHING IA',
      text: 'Conversación libre que cambia tu plan.',
      icon: MessageCircle,
      glow: true,
    },
    {
      title: 'TÉCNICA',
      text: 'Notas para evitar lesiones y mejorar ejecución.',
      icon: Dumbbell,
    },
  ]

  return (
    <section className="py-[72px]">
      <Container>
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-black uppercase mb-4">SERVICIOS GYMRATIA</h2>
          <p className="text-[#A7AFBE] text-lg">Todo lo que necesitas para empezar fuerte.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {services.map((service, idx) => {
            const Icon = service.icon
            return (
              <Card 
                key={idx} 
                variant={service.glow ? 'accentTile' : 'darkTile'}
                className={cn(
                  'text-center',
                  service.glow && 'shadow-[0_0_40px_rgba(255,45,45,0.25)]'
                )}
              >
                <Icon className="h-8 w-8 text-[#FF2D2D] mx-auto mb-4" />
                <h3 className="font-heading text-base font-bold mb-2 uppercase">{service.title}</h3>
                <p className="text-xs text-[#A7AFBE]">{service.text}</p>
              </Card>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

// Testimonials Section
function Testimonials() {
  const testimonials = [
    {
      name: 'Usuario 1',
      rating: 5,
      text: 'Plan súper claro y realista. Me quitó dudas desde el día uno.',
      variant: 'surface' as const,
    },
    {
      name: 'Usuario 2',
      rating: 5,
      text: 'El chat libre hizo que el plan evitara justo lo que no me gusta.',
      variant: 'surfaceAccentOutline' as const,
    },
    {
      name: 'Usuario 3',
      rating: 5,
      text: 'Edu me apretó pero con lógica. Carolina me cuidó las rodillas.',
      variant: 'surface' as const,
    },
  ]

  return (
    <section id="testimonials" className="py-[72px]">
      <Container>
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-black uppercase mb-4">
            LO QUE DICEN NUESTROS <span className="text-[#FF2D2D]">CLIENTES</span>
          </h2>
          <p className="text-[#A7AFBE] text-lg">Resultados reales de gente real.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px]">
          {testimonials.map((testimonial, idx) => (
            <Card key={idx} variant={testimonial.variant}>
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[#FF2D2D] text-[#FF2D2D]" />
                ))}
              </div>
              <p className="text-[#A7AFBE] mb-4 text-sm">"{testimonial.text}"</p>
              <p className="text-xs text-[#7B8291]">{testimonial.name}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  )
}

// Final CTA Section
function FinalCTA() {
  return (
    <section className="py-[84px]">
      <Container>
        <Card 
          variant="surface" 
          className="text-center border border-[rgba(255,255,255,0.08)] shadow-[0_0_40px_rgba(255,45,45,0.25)]"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-black uppercase mb-4">
            EMPIEZA HOY TU TRANSFORMACIÓN
          </h2>
          <p className="text-[#A7AFBE] text-lg mb-8">
            En menos de 5 minutos tienes tu plan de 9 semanas.
          </p>
          <div className="flex justify-center">
            <StartButton text="Comenzar ahora" size="xl" />
          </div>
        </Card>
      </Container>
    </section>
  )
}

// Footer
function Footer() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.08)] py-10">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-heading text-lg font-bold mb-4">Producto</h3>
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
            </ul>
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-sm transition-colors">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="#" className="text-[#A7AFBE] hover:text-[#FF2D2D] text-sm transition-colors">
                  Términos
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold mb-4">Contacto</h3>
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
      </Container>
    </footer>
  )
}

// Main Page Component
export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="bg-[#0A0A0B] min-h-screen flex items-center justify-center">
        <div className="text-[#F8FAFC]">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="bg-[#0A0A0B] min-h-screen">
      <PersonalizedNavbar />
      {user ? (
        <EpicHomeAuthenticated />
      ) : (
        <>
          <Hero />
          <WhyChooseUs />
          <TrainersPreview />
          <ServicesTiles />
          <Testimonials />
          <FinalCTA />
          <Footer />
        </>
      )}
    </div>
  )
}
