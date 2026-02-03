'use client'

import { useState, useEffect } from 'react'
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
  Star,
  FileText,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import SafeImage from './_components/SafeImage'
import HeroBackgroundVideo from './_components/HeroBackgroundVideo'
import { StartButton } from './_components/StartButton'
import { PersonalizedHero } from './_components/PersonalizedHero'
import { PersonalizedNavbar } from './_components/PersonalizedNavbar'
import { EpicHomeAuthenticated } from './_components/EpicHomeAuthenticated'
import { useAuth } from './_components/AuthProvider'
import { LoadingScreen } from './_components/LoadingScreen'
import { ModeSelectionScreen } from './_components/ModeSelectionScreen'
import { TrainersPreviewClient } from './_components/TrainersPreviewClient'
import { AppFooter } from './_components/AppFooter'

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
        <HeroBackgroundVideo src="/videos/GymRatiaBueno.mp4" mobileSrc="/videos/videomovil.mp4" />
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        {/* Bottom fade so video blends into page */}
        <div className="absolute bottom-0 left-0 right-0 h-48 md:h-64 bg-gradient-to-b from-transparent to-[#0A0A0B] pointer-events-none" />
      </div>
      
      <Container className="relative z-10 grid md:grid-cols-2 gap-8 items-center pt-20 pb-32 md:pb-40">
        <PersonalizedHero />
        <div className="flex flex-wrap gap-6 pt-8">
          <div className="flex flex-col">
            <span className="text-2xl font-heading font-bold text-[#FF2D2D]">Planes</span>
            <span className="text-sm text-[#A7AFBE]">adaptados</span>
            <span className="text-xs text-[#7B8291] mt-1">A tu objetivo y tiempo</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-heading font-bold text-[#F8FAFC]">3</span>
            <span className="text-sm text-[#A7AFBE]">entrenadores</span>
            <span className="text-xs text-[#7B8291] mt-1">Con estilos únicos</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-heading font-bold text-[#F8FAFC]">24/7</span>
            <span className="text-xs text-[#7B8291] mt-1">Cuándo y donde quieras</span>
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
      title: 'ENTRENADOR IA PERSONAL',
      text: 'Chat directo con tu entrenador virtual. Te guía, adapta y motiva 24/7.',
      icon: MessageCircle,
    },
    {
      title: 'PLANES COMPLETOS',
      text: 'Entrenamientos estructurados y dietas personalizadas que evolucionan contigo.',
      icon: Clipboard,
    },
    {
      title: 'SEGUIMIENTO INTEGRAL',
      text: 'Registra peso, fotos, ejercicios y comidas. Todo en un solo lugar.',
      icon: Target,
    },
    {
      title: 'ENTRENADORES REALES',
      text: 'Elige entre entrenadores IA o conecta con entrenadores profesionales reales.',
      icon: Users,
    },
  ]

  return (
    <section className="py-[72px]">
      <Container>
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-black uppercase mb-4">
            POR QUÉ <span className="text-[#FF2D2D]">ELEGIRNOS</span>
          </h2>
          <p className="text-[#A7AFBE] text-lg">Tu entrenador personal en el bolsillo. IA que entiende tu progreso y adapta tu plan.</p>
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
  return <TrainersPreviewClient />
}

// Services Tiles Section
function ServicesTiles() {
  const services = [
    {
      title: 'CHAT CON ENTRENADOR',
      text: 'Conversa libremente con tu entrenador IA. Pregunta, pide cambios y recibe feedback instantáneo.',
      icon: MessageCircle,
      glow: true,
    },
    {
      title: 'ENTRENAMIENTOS',
      text: 'Rutinas estructuradas por días y semanas. Ejercicios, series, repeticiones y progresión.',
      icon: Dumbbell,
    },
    {
      title: 'NUTRICIÓN',
      text: 'Planes de dieta personalizados, meal planner semanal y seguimiento de macros.',
      icon: Salad,
    },
    {
      title: 'PROGRESO',
      text: 'Registra peso, fotos de progreso y logs de entrenamiento. Visualiza tu evolución.',
      icon: Target,
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
      text: 'Jey me apretó pero con lógica. Plan adaptado a mis necesidades.',
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

// Final CTA Section para Alumnos
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

// Final CTA Section para Entrenadores
function TrainerFinalCTA() {
  return (
    <section className="py-[84px]">
      <Container>
        <Card 
          variant="surface" 
          className="text-center border border-[rgba(255,255,255,0.08)] shadow-[0_0_40px_rgba(255,45,45,0.25)]"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-black uppercase mb-4">
            CREA TU ENTRENADOR IA HOY
          </h2>
          <p className="text-[#A7AFBE] text-lg mb-8">
            En minutos tendrás tu IA personalizada lista para atender a tus alumnos 24/7.
          </p>
          <div className="flex justify-center">
            <StartButton text="Empezar como entrenador" size="xl" />
          </div>
        </Card>
      </Container>
    </section>
  )
}

// Hero Section para Entrenadores (no logueados)
function TrainerHero() {
  return (
    <section className="relative min-h-[100vh] md:min-h-[95vh] flex items-center overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <HeroBackgroundVideo src="/videos/GymRatiaBueno.mp4" mobileSrc="/videos/videomovil.mp4" />
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-48 md:h-64 bg-gradient-to-b from-transparent to-[#0A0A0B] pointer-events-none" />
      </div>
      
      <Container className="relative z-10 grid md:grid-cols-2 gap-8 items-center pt-20 pb-32 md:pb-40">
        <div>
          <p className="text-xs tracking-[0.18em] text-[#A7AFBE] uppercase mb-4">
            PARA ENTRENADORES
          </p>
          <h1 className="font-heading text-[44px] md:text-[72px] leading-[0.95] font-black uppercase mb-6">
            <span className="text-[#F8FAFC]">CREA TU</span><br />
            <span className="text-[#FF2D2D]">ENTRENADOR IA</span><br />
            <span className="text-[#F8FAFC]">PERSONALIZADO</span>
          </h1>
          <p className="text-lg text-[#A7AFBE] max-w-[520px] mb-8">
            Alimenta a tu IA con tu metodología única. Tus alumnos tendrán acceso a un entrenador virtual que habla como tú, piensa como tú y entrena como tú.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <StartButton text="Empezar como entrenador" size="xl" />
            <Button href="/trainers" variant="ghost" size="xl">
              Ver cómo funciona
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 pt-8">
          <div className="flex flex-col">
            <span className="text-2xl font-heading font-bold text-[#FF2D2D]">IA</span>
            <span className="text-sm text-[#A7AFBE]">Personalizada</span>
            <span className="text-xs text-[#7B8291] mt-1">Tu metodología</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-heading font-bold text-[#F8FAFC]">24/7</span>
            <span className="text-sm text-[#A7AFBE]">Disponible</span>
            <span className="text-xs text-[#7B8291] mt-1">Para tus alumnos</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-heading font-bold text-[#F8FAFC]">∞</span>
            <span className="text-xs text-[#7B8291] mt-1">Escalable</span>
          </div>
        </div>
      </Container>
    </section>
  )
}

// Why Choose Us para Entrenadores
function TrainerWhyChooseUs() {
  const features = [
    {
      title: 'IA PERSONALIZADA',
      text: 'Alimenta a tu IA con tu metodología, principios y estilo único de entrenamiento.',
      icon: Sparkles,
    },
    {
      title: 'CONTENIDO PROPIO',
      text: 'Define tus entrenamientos y planes de dieta. Tu IA los utilizará con tus alumnos.',
      icon: FileText,
    },
    {
      title: 'PERFIL PÚBLICO',
      text: 'Los alumnos pueden encontrarte y empezar a trabajar contigo de forma inmediata.',
      icon: Users,
    },
    {
      title: 'ESCALABILIDAD',
      text: 'Atiende a múltiples alumnos simultáneamente sin límites de tiempo o capacidad.',
      icon: TrendingUp,
    },
  ]

  return (
    <section className="py-[72px]">
      <Container>
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-black uppercase mb-4">
            POR QUÉ <span className="text-[#FF2D2D]">ELEGIR GYMRATIA</span>
          </h2>
          <p className="text-[#A7AFBE] text-lg">La plataforma que te permite escalar tu metodología con IA.</p>
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

// Services para Entrenadores
function TrainerServices() {
  const services = [
    {
      title: 'DEFINE TU METODOLOGÍA',
      text: 'Crea entrenamientos y planes de dieta que reflejen tu estilo único. Tu IA los utilizará automáticamente.',
      icon: Dumbbell,
      glow: true,
    },
    {
      title: 'PERFIL PÚBLICO',
      text: 'Los alumnos te encuentran fácilmente. Tu perfil muestra tu experiencia, certificaciones y enfoque.',
      icon: Users,
    },
    {
      title: 'GESTIÓN DE ALUMNOS',
      text: 'Ve quién está trabajando contigo, su progreso y mantén el control de tus relaciones.',
      icon: Target,
    },
    {
      title: 'ANALÍTICAS',
      text: 'Métricas detalladas de tus alumnos, popularidad de tus planes y crecimiento de tu marca.',
      icon: TrendingUp,
    },
  ]

  return (
    <section className="py-[72px]">
      <Container>
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-black uppercase mb-4">SERVICIOS PARA ENTRENADORES</h2>
          <p className="text-[#A7AFBE] text-lg">Todo lo que necesitas para hacer crecer tu marca personal.</p>
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

// Main Page Component
export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const [userMode, setUserMode] = useState<'student' | 'trainer'>('student')
  const [showModeSelection, setShowModeSelection] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Marcar como montado en el cliente
  useEffect(() => {
    console.log('[Home] mounted=true')
    setMounted(true)
  }, [])

  // Inicializar modo cuando el componente está montado
  useEffect(() => {
    if (!mounted || authLoading) return
    if (typeof window === 'undefined') return
    
    const preferredMode = localStorage.getItem('preferred_mode') as 'student' | 'trainer' | null
    const savedMode = localStorage.getItem('user_mode') as 'student' | 'trainer' | null
    
    if (user) {
      // Usuario logueado: usar modo guardado
      const mode = savedMode || 'student'
      setUserMode(mode)
      setShowModeSelection(false)
    } else {
      // Usuario no logueado: SIEMPRE mostrar selección si no hay modo guardado
      if (!preferredMode && !savedMode) {
        setShowModeSelection(true)
      } else {
        setUserMode(preferredMode || savedMode || 'student')
        setShowModeSelection(false)
      }
    }
  }, [user, authLoading, mounted])

  // Escuchar cambios en localStorage para actualizar el modo inmediatamente
  useEffect(() => {
    if (!mounted) return
    if (typeof window === 'undefined') return
    
    const handleModeChange = () => {
      const savedMode = localStorage.getItem('user_mode') as 'student' | 'trainer' | null
      if (savedMode && savedMode !== userMode) {
        setUserMode(savedMode)
      }
    }
    
    // Verificar cada 200ms para cambios inmediatos del toggle
    const interval = setInterval(() => {
      const savedMode = localStorage.getItem('user_mode') as 'student' | 'trainer' | null
      if (savedMode && savedMode !== userMode) {
        setUserMode(savedMode)
      }
    }, 200)
    
    // Escuchar evento personalizado
    window.addEventListener('modechange', handleModeChange)
    window.addEventListener('storage', handleModeChange)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('modechange', handleModeChange)
      window.removeEventListener('storage', handleModeChange)
    }
  }, [mounted, userMode])

  const handleModeSelected = (mode: 'student' | 'trainer') => {
    setUserMode(mode)
    setShowModeSelection(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred_mode', mode)
      localStorage.setItem('user_mode', mode)
    }
  }

  console.log('[Home] render:', { authLoading, mounted, hasUser: !!user })
  if (authLoading || !mounted) {
    console.log('[Home] -> LoadingScreen')
    return <LoadingScreen />
  }

  // Mostrar pantalla de elección si no hay modo seleccionado y no está logueado
  if (!user && showModeSelection) {
    return (
      <div className="bg-[#0A0A0B] min-h-screen">
        <PersonalizedNavbar />
        <ModeSelectionScreen onModeSelected={handleModeSelected} />
      </div>
    )
  }

  return (
    <div className="bg-[#0A0A0B] min-h-screen">
      <PersonalizedNavbar />
      {user ? (
        // Usuario logueado - mostrar contenido según modo
        <EpicHomeAuthenticated />
      ) : (
        // Usuario NO logueado - mostrar página principal según modo
        <>
          {userMode === 'trainer' ? (
            // Página principal para ENTRENADORES (no logueados)
            <>
              <TrainerHero />
              <TrainerWhyChooseUs />
              <TrainerServices />
              <TrainerFinalCTA />
              <AppFooter />
            </>
          ) : (
            // Página principal para ALUMNOS (no logueados)
            <>
              <Hero />
              <WhyChooseUs />
              <TrainersPreview />
              <ServicesTiles />
              <Testimonials />
              <FinalCTA />
              <AppFooter />
            </>
          )}
        </>
      )}
    </div>
  )
}
