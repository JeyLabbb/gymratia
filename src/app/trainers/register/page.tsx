'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Dumbbell, User, Mail, Lock, FileText, Users, Shield, ArrowRight, CheckCircle2, Upload, X, Award } from 'lucide-react'

type Certificate = {
  id: string
  name: string
  organization: string
  issueDate: string
  expiryDate: string
  file: File | null
  fileUrl: string | null
  fileName: string | null
}

export default function TrainerRegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStep = searchParams.get('step') === '2' ? 2 : 1
  const [step, setStep] = useState<1 | 2>(initialStep as 1 | 2)
  
  const { user } = useAuth()
  
  // Si ya está autenticado y viene de OAuth, ir directo al paso 2
  useEffect(() => {
    if (user && initialStep === 2) {
      // El usuario ya está autenticado, solo necesita completar el perfil
      // Verificar si ya tiene perfil de entrenador
      supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data: trainer }) => {
          if (trainer) {
            // Ya tiene perfil, ir a onboarding
            router.push('/trainers/onboarding')
          }
          // Si no tiene perfil, quedarse en paso 2
        })
    }
  }, [user, initialStep, router])
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    trainerName: '',
    specialty: '',
    description: '',
    experience: '',
    philosophy: '',
    visibilityStatus: 'PRIVATE' as 'PRIVATE' | 'REQUEST_ACCESS' | 'PUBLIC'
  })
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingCert, setUploadingCert] = useState(false)
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const [checkingName, setCheckingName] = useState(false)
  const { signUpWithEmail, signInWithGoogle } = useAuth()

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.fullName || !formData.email || !formData.password) {
      setError('Por favor completa todos los campos')
      return
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setStep(2)
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      // Guardar que viene del registro de entrenador
      localStorage.setItem('registering_as_trainer', 'true')
      await signInWithGoogle()
    } catch (err: any) {
      console.error('Error en Google sign in:', err)
      setError(err.message || 'Error al iniciar sesión con Google')
      setLoading(false)
    }
  }

  const addCertificate = () => {
    setCertificates([
      ...certificates,
      {
        id: Date.now().toString(),
        name: '',
        organization: '',
        issueDate: '',
        expiryDate: '',
        file: null,
        fileUrl: null,
        fileName: null
      }
    ])
  }

  const removeCertificate = (id: string) => {
    setCertificates(certificates.filter(c => c.id !== id))
  }

  const updateCertificate = (id: string, field: keyof Certificate, value: any) => {
    setCertificates(certificates.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ))
  }

  const handleCertificateFileUpload = async (certIndex: number, file: File) => {
    if (!user) {
      setError('Debes estar autenticado para subir archivos')
      return
    }

    setUploadingCert(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No hay sesión activa')
      }

      // Verificar si el bucket existe
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      if (bucketsError) {
        throw new Error('Error accediendo al almacenamiento')
      }

      const certificatesBucket = buckets?.find(b => b.id === 'trainer-certificates')
      if (!certificatesBucket) {
        // Intentar crear el bucket automáticamente
        try {
          const setupResponse = await fetch('/api/storage/setup-bucket', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ bucketId: 'trainer-certificates' }),
          })

          const setupData = await setupResponse.json()
          if (!setupResponse.ok || setupData.manualSetupRequired) {
            setError('El bucket "trainer-certificates" no existe. Por favor, ejecuta el script create-storage-buckets.sql en Supabase SQL Editor.')
            setUploadingCert(false)
            return
          }
        } catch (setupError) {
          setError('Error: El bucket "trainer-certificates" no existe. Por favor, ejecuta el script create-storage-buckets.sql en Supabase.')
          setUploadingCert(false)
          return
        }
      }

      // Subir archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}-${Date.now()}-${certIndex}.${fileExt}`
      const filePath = `${session.user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('trainer-certificates')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('trainer-certificates')
        .getPublicUrl(filePath)

      // Actualizar certificado con la URL
      setCertificates(certificates.map((c, i) => 
        i === certIndex ? { 
          ...c, 
          file: file,
          fileUrl: publicUrl,
          fileName: file.name
        } : c
      ))
    } catch (err: any) {
      console.error('Error subiendo certificado:', err)
      setError(err.message || 'Error al subir el archivo')
    } finally {
      setUploadingCert(false)
    }
  }

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.trainerName) {
      setError('El nombre como entrenador es requerido')
      return
    }

    // Verificar disponibilidad del nombre antes de enviar
    if (nameAvailable === false) {
      setError('Este nombre ya está en uso. Elige otro.')
      return
    }

    setLoading(true)

    try {
      // Si no está autenticado, crear cuenta primero
      let session
      if (!user) {
        await signUpWithEmail(formData.email, formData.password, formData.fullName)
        // Esperar a que se establezca la sesión
        await new Promise(resolve => setTimeout(resolve, 1000))
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) {
          throw new Error('No se pudo establecer la sesión')
        }
        session = sessionData.session
      } else {
        // Ya está autenticado (viene de Google OAuth)
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) {
          throw new Error('No hay sesión activa')
        }
        session = sessionData.session
      }

      // Guardar modo entrenador
      localStorage.setItem('user_mode', 'trainer')

      // Preparar certificados para enviar
      const certificatesData = certificates.map(cert => ({
        name: cert.name,
        organization: cert.organization,
        issueDate: cert.issueDate || null,
        expiryDate: cert.expiryDate || null,
        fileUrl: cert.fileUrl,
        fileName: cert.fileName
      }))

      // Crear perfil de entrenador en BD
      const registerResponse = await fetch('/api/trainer/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: session.user.id,
          trainerName: formData.trainerName,
          specialty: formData.specialty,
          description: formData.description,
          experience: formData.experience,
          philosophy: formData.philosophy || formData.description, // Usar description como fallback
          visibilityStatus: formData.visibilityStatus,
          certificates: certificatesData
        })
      })

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al crear el perfil de entrenador')
      }

      const { trainer } = await registerResponse.json()

      // Redirigir al onboarding de entrenador
      router.push(`/trainers/onboarding?trainerId=${trainer.id}`)
    } catch (err: any) {
      console.error('Error en registro:', err)
      setError(err.message || 'Error al crear la cuenta. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050509] via-[#050509] to-[#0A0A0B] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-heading font-extrabold tracking-tight">
            GymRat<span className="text-[#FF2D2D]">IA</span>
          </Link>
          <p className="text-sm text-[#9CA3AF] mt-2">Registro para entrenadores</p>
        </div>

        <div className="bg-[#14161B] border border-[rgba(255,255,255,0.08)] rounded-[22px] p-8">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#FF2D2D]' : 'text-[#6B7280]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step >= 1 
                  ? 'bg-[#FF2D2D] border-[#FF2D2D] text-white' 
                  : 'border-[#6B7280] text-[#6B7280]'
              }`}>
                {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <span className="text-xs font-medium hidden sm:inline">Cuenta</span>
            </div>
            <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-[#FF2D2D]' : 'bg-[#6B7280]'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#FF2D2D]' : 'text-[#6B7280]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step >= 2 
                  ? 'bg-[#FF2D2D] border-[#FF2D2D] text-white' 
                  : 'border-[#6B7280] text-[#6B7280]'
              }`}>
                2
              </div>
              <span className="text-xs font-medium hidden sm:inline">Perfil</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 1 && !user ? (
            <form onSubmit={handleStep1Submit} className="space-y-5">
              <div>
                <h2 className="font-heading text-xl font-bold text-[#F8FAFC] mb-1">
                  Crea tu cuenta
                </h2>
                <p className="text-sm text-[#A7AFBE] mb-6">
                  Primero necesitamos tus datos básicos para crear tu cuenta de entrenador.
                </p>
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                  placeholder="Tu nombre completo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Contraseña
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
                <p className="text-xs text-[#6B7280] mt-1">Mínimo 6 caracteres</p>
              </div>

              <button
                type="submit"
                className="w-full rounded-[16px] bg-[#FF2D2D] text-[#F8FAFC] px-6 py-3 font-semibold hover:bg-[#FF3D3D] transition-colors flex items-center justify-center gap-2"
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[rgba(255,255,255,0.08)]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#14161B] text-[#A7AFBE]">O continúa con</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] px-6 py-3 font-medium hover:bg-[#1F2229] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar con Google
              </button>
            </form>
          ) : step === 2 ? (
            <form onSubmit={handleStep2Submit} className="space-y-5">
              <div>
                <h2 className="font-heading text-xl font-bold text-[#F8FAFC] mb-1">
                  Completa tu perfil de entrenador
                </h2>
                <p className="text-sm text-[#A7AFBE] mb-6">
                  Cuéntanos sobre ti y cómo trabajas. Podrás editar esto más tarde.
                </p>
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Nombre como entrenador <span className="text-[#FF2D2D]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.trainerName}
                  onChange={async (e) => {
                    const value = e.target.value
                    setFormData({ ...formData, trainerName: value })
                    setNameAvailable(null)
                    
                    // Validar disponibilidad con debounce
                    if (value.trim().length >= 3) {
                      setCheckingName(true)
                      const timeoutId = setTimeout(async () => {
                        try {
                          const { data: { session } } = await supabase.auth.getSession()
                          if (!session) return
                          
                          const response = await fetch('/api/trainer/check-name', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${session.access_token}`
                            },
                            body: JSON.stringify({ trainerName: value })
                          })
                          
                          const data = await response.json()
                          setNameAvailable(data.available)
                        } catch (err) {
                          console.error('Error verificando nombre:', err)
                        } finally {
                          setCheckingName(false)
                        }
                      }, 500)
                      
                      return () => clearTimeout(timeoutId)
                    }
                  }}
                  className={`w-full rounded-[16px] bg-[#1A1D24] border px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 ${
                    nameAvailable === false 
                      ? 'border-red-500/50 focus:ring-red-500' 
                      : nameAvailable === true
                      ? 'border-green-500/50 focus:ring-green-500'
                      : 'border-[rgba(255,255,255,0.08)] focus:ring-[#FF2D2D]'
                  }`}
                  placeholder="Ej: Jey, Carlos, Ana..."
                  required
                />
                <div className="mt-1">
                  {checkingName && (
                    <p className="text-xs text-[#6B7280]">Verificando disponibilidad...</p>
                  )}
                  {!checkingName && nameAvailable === false && (
                    <p className="text-xs text-red-400">Este nombre ya está en uso. Elige otro.</p>
                  )}
                  {!checkingName && nameAvailable === true && (
                    <p className="text-xs text-green-400">✓ Nombre disponible</p>
                  )}
                  {!checkingName && nameAvailable === null && formData.trainerName.length > 0 && formData.trainerName.length < 3 && (
                    <p className="text-xs text-[#6B7280]">Mínimo 3 caracteres</p>
                  )}
                  {!checkingName && nameAvailable === null && formData.trainerName.length === 0 && (
                    <p className="text-xs text-[#6B7280]">El nombre con el que te conocerán tus alumnos. Debe ser único.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Especialidad / Estilo
                </label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                  placeholder="Ej: Fuerza, Hipertrofia, Crossfit, Calistenia..."
                />
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Descripción breve
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] min-h-[80px] resize-none"
                  placeholder="Descripción breve de tu estilo y especialidad..."
                />
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Filosofía de entrenamiento
                </label>
                <textarea
                  value={formData.philosophy}
                  onChange={(e) => setFormData({ ...formData, philosophy: e.target.value })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] min-h-[100px] resize-none"
                  placeholder="Cuéntanos tu filosofía de entrenamiento, tu estilo, qué te hace diferente..."
                />
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Años de experiencia
                </label>
                <input
                  type="text"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                  placeholder="Ej: 5 años, 10+ años..."
                />
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Visibilidad
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] cursor-pointer hover:border-[#FF2D2D]/50 transition-colors">
                    <input
                      type="radio"
                      name="visibility"
                      value="PRIVATE"
                      checked={formData.visibilityStatus === 'PRIVATE'}
                      onChange={(e) => setFormData({ ...formData, visibilityStatus: e.target.value as any })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#F8FAFC]">Privado</p>
                      <p className="text-xs text-[#A7AFBE]">Tu perfil es privado. Solo tú puedes acceder. Puedes solicitar aparecer en público más adelante.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] cursor-pointer hover:border-[#FF2D2D]/50 transition-colors">
                    <input
                      type="radio"
                      name="visibility"
                      value="REQUEST_ACCESS"
                      checked={formData.visibilityStatus === 'REQUEST_ACCESS'}
                      onChange={(e) => setFormData({ ...formData, visibilityStatus: e.target.value as any })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#F8FAFC]">Solicitud de acceso</p>
                      <p className="text-xs text-[#A7AFBE]">Los alumnos pueden solicitarte acceso. Requiere completar solicitud de perfil público.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] cursor-pointer hover:border-[#FF2D2D]/50 transition-colors">
                    <input
                      type="radio"
                      name="visibility"
                      value="PUBLIC"
                      checked={formData.visibilityStatus === 'PUBLIC'}
                      onChange={(e) => setFormData({ ...formData, visibilityStatus: e.target.value as any })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#F8FAFC]">Público</p>
                      <p className="text-xs text-[#A7AFBE]">Apareces en la lista pública de entrenadores. Requiere completar solicitud y aprobación.</p>
                    </div>
                  </label>
                </div>
                <p className="text-xs text-[#6B7280] mt-2">
                  Si eliges "Solicitud de acceso" o "Público", deberás completar una solicitud con los requisitos necesarios después de crear tu perfil.
                </p>
              </div>

              {/* Certificados */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm text-[#A7AFBE] flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Certificados / Títulos (opcional)
                  </label>
                  <button
                    type="button"
                    onClick={addCertificate}
                    className="text-xs text-[#FF2D2D] hover:text-[#FF3D3D] font-medium"
                  >
                    + Añadir certificado
                  </button>
                </div>
                
                {certificates.length === 0 ? (
                  <p className="text-xs text-[#6B7280] mb-3">
                    Añade certificados o títulos para aumentar tu credibilidad. Puedes añadirlos más tarde. Se requerirán si solicitas aparecer en público.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {certificates.map((cert) => (
                      <div key={cert.id} className="rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="text-sm font-medium text-[#F8FAFC]">Certificado</h4>
                          <button
                            type="button"
                            onClick={() => removeCertificate(cert.id)}
                            className="text-[#9CA3AF] hover:text-[#FF2D2D] transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={cert.name}
                            onChange={(e) => updateCertificate(cert.id, 'name', e.target.value)}
                            className="w-full rounded-[12px] bg-[#050509] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                            placeholder="Nombre del certificado"
                          />
                          <input
                            type="text"
                            value={cert.organization}
                            onChange={(e) => updateCertificate(cert.id, 'organization', e.target.value)}
                            className="w-full rounded-[12px] bg-[#050509] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                            placeholder="Organización que lo emitió"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-[#A7AFBE] mb-1 block">Fecha de emisión</label>
                              <input
                                type="date"
                                value={cert.issueDate}
                                onChange={(e) => updateCertificate(cert.id, 'issueDate', e.target.value)}
                                className="w-full rounded-[12px] bg-[#050509] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[#A7AFBE] mb-1 block">Fecha de caducidad (opcional)</label>
                              <input
                                type="date"
                                value={cert.expiryDate}
                                onChange={(e) => updateCertificate(cert.id, 'expiryDate', e.target.value)}
                                className="w-full rounded-[12px] bg-[#050509] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                              />
                            </div>
                          </div>
                          <label className="block">
                            <span className="text-xs text-[#A7AFBE] mb-1 block">Archivo del certificado (PDF, JPG, PNG)</span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  await handleCertificateFileUpload(
                                    certificates.findIndex(c => c.id === cert.id),
                                    file
                                  )
                                }
                              }}
                              className="w-full rounded-[12px] bg-[#050509] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] file:mr-4 file:py-1 file:px-2 file:rounded-[8px] file:border-0 file:text-xs file:font-medium file:bg-[#FF2D2D] file:text-white hover:file:bg-[#FF3D3D]"
                            />
                            {cert.fileName && (
                              <p className="text-xs text-[#22C55E] mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {cert.fileName}
                              </p>
                            )}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-[16px] bg-transparent border border-[rgba(255,255,255,0.24)] text-[#F8FAFC] px-6 py-3 font-medium hover:border-[#FF2D2D]/70 transition-colors"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingCert}
                  className="flex-1 rounded-[16px] bg-[#FF2D2D] text-[#F8FAFC] px-6 py-3 font-semibold hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      Crear cuenta de entrenador
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-6 text-center text-sm text-[#A7AFBE]">
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="text-[#FF2D2D] hover:underline">
              Inicia sesión
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link href="/trainers" className="text-xs text-[#6B7280] hover:text-[#9CA3AF] transition-colors">
              ← Volver a explorar entrenadores
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

