'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Save, Upload, X, Plus, Trash2, Star, Users, Target, Sparkles, Calendar, Instagram, Globe, Youtube, Twitter, Image as ImageIcon, Award, CheckCircle2 } from 'lucide-react'
import { ImageCropper } from '@/app/_components/ImageCropper'

export default function TrainerSettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [trainer, setTrainer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [certificates, setCertificates] = useState<Array<{
    id: string
    name: string
    organization: string
    issueDate: string
    expiryDate: string
    fileUrl: string | null
    fileName: string | null
  }>>([])
  const [uploadingCert, setUploadingCert] = useState(false)
  const [socialProofFiles, setSocialProofFiles] = useState<Array<{
    id: string
    url: string
    fileName: string
    type: 'image' | 'file'
  }>>([])
  const [uploadingSocialProof, setUploadingSocialProof] = useState(false)
  
  const [formData, setFormData] = useState({
    trainer_name: '',
    description: '',
    philosophy: '',
    specialty: '',
    experience_years: '',
    intensity: 5,
    flexibility: 5,
    cycle_weeks: 8,
    ideal_for: [] as string[],
    offers: [] as Array<{ title: string; description: string; icon?: string }>,
    instagram_url: '',
    website_url: '',
    youtube_url: '',
    twitter_url: '',
    tiktok_url: '',
    contact_phone: '',
    contact_email: '',
    avatar_url: '',
    social_handle: '',
    social_proof: '',
    uploadingAvatar: false,
    showCropper: false,
    tempImageSrc: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }

    if (user) {
      // Cargar datos guardados de localStorage si existen
      const savedFormData = localStorage.getItem('trainer-settings-form')
      if (savedFormData) {
        try {
          const parsed = JSON.parse(savedFormData)
          setFormData(parsed.formData || formData)
          setCertificates(parsed.certificates || [])
          setSocialProofFiles(parsed.socialProofFiles || [])
        } catch (e) {
          console.error('Error cargando datos guardados:', e)
        }
      }
      
      loadTrainerData()
    }
  }, [user, authLoading, router])
  
  // Guardar formulario en localStorage cuando cambia
  useEffect(() => {
    if (user && !loading) {
      const dataToSave = {
        formData,
        certificates,
        socialProofFiles,
        timestamp: Date.now()
      }
      localStorage.setItem('trainer-settings-form', JSON.stringify(dataToSave))
    }
  }, [formData, certificates, socialProofFiles, user, loading])

  const loadTrainerData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      const { data: trainerData, error: trainerError } = await supabase
        .from('trainers')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (trainerError) {
        console.error('Error cargando trainer:', trainerError)
        setError('Error al cargar tu perfil')
        setLoading(false)
        return
      }

      if (!trainerData) {
        router.push('/trainers/register?step=2')
        return
      }

      setTrainer(trainerData)
      
      // Cargar certificados del entrenador
      const { data: certsData } = await supabase
        .from('trainer_certificates')
        .select('id, certificate_name, issuing_organization, issue_date, expiry_date, certificate_file_url, certificate_file_name')
        .eq('trainer_id', trainerData.id)
        .order('issue_date', { ascending: false })
      
      if (certsData) {
        setCertificates(certsData.map(cert => ({
          id: cert.id,
          name: cert.certificate_name || '',
          organization: cert.issuing_organization || '',
          issueDate: cert.issue_date || '',
          expiryDate: cert.expiry_date || '',
          fileUrl: cert.certificate_file_url,
          fileName: cert.certificate_file_name
        })))
      }
      
      // Parsear datos existentes
      // Asegurar que avatar_url se carga correctamente (puede ser null, undefined o string vacío)
      const avatarUrl = trainerData.avatar_url && trainerData.avatar_url.trim() !== '' 
        ? trainerData.avatar_url 
        : ''
      
      setFormData({
        trainer_name: trainerData.trainer_name || '',
        description: trainerData.description || '',
        philosophy: trainerData.philosophy || '',
        specialty: trainerData.specialty || '',
        experience_years: trainerData.experience_years || '',
        intensity: trainerData.intensity || 5,
        flexibility: trainerData.flexibility || 5,
        cycle_weeks: trainerData.cycle_weeks || 8,
        ideal_for: trainerData.ideal_for || [],
        offers: trainerData.offers || [],
        instagram_url: trainerData.instagram_url || '',
        social_handle: trainerData.social_handle || '',
        social_proof: trainerData.social_proof || '',
        website_url: trainerData.website_url || '',
        youtube_url: trainerData.youtube_url || '',
        twitter_url: trainerData.twitter_url || '',
        tiktok_url: trainerData.tiktok_url || '',
        contact_phone: trainerData.contact_phone || '',
        contact_email: trainerData.contact_email || trainerData.email || '',
        avatar_url: avatarUrl,
        uploadingAvatar: false,
        showCropper: false,
        tempImageSrc: ''
      })
      
      // Extraer archivos del social_proof si existen
      // Formato: texto...\n\nArchivos:\nurl1\nurl2
      const socialProofText = trainerData.social_proof || ''
      const archivosMatch = socialProofText.match(/Archivos:\n(.+)$/s)
      if (archivosMatch) {
        const urls = archivosMatch[1].trim().split('\n').filter((url: string) => url.trim().startsWith('http'))
        const files = urls.map((url: string, idx: number) => {
          const fileName = url.split('/').pop() || `archivo-${idx + 1}`
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)
          return {
            id: `existing-${idx}`,
            url: url.trim(),
            fileName: fileName,
            type: isImage ? 'image' as const : 'file' as const
          }
        })
        setSocialProofFiles(files)
        // Remover la sección de archivos del texto
        const textWithoutFiles = socialProofText.replace(/\n\nArchivos:\n.+$/s, '').trim()
        setFormData((prev) => ({ ...prev, social_proof: textWithoutFiles }))
      }
      
      console.log('Avatar URL cargado:', avatarUrl) // Debug
    } catch (err) {
      console.error('Error cargando datos:', err)
      setError('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!trainer || !user) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('No hay sesión activa')
        setSaving(false)
        return
      }

      // Verificar nombre único si cambió
      if (formData.trainer_name !== trainer.trainer_name) {
        const normalizedName = formData.trainer_name.toLowerCase().trim().replace(/\s+/g, '-')
        const { data: existing } = await supabase
          .from('trainers')
          .select('id')
          .neq('id', trainer.id)
          .ilike('trainer_name', formData.trainer_name)
          .maybeSingle()

        if (existing) {
          setError('Este nombre ya está en uso. Elige otro.')
          setSaving(false)
          return
        }
      }

      // Preparar datos de actualización básicos (campos que siempre existen)
      const updateData: any = {
        trainer_name: formData.trainer_name,
        description: formData.description || null,
        philosophy: formData.philosophy || null,
        specialty: formData.specialty || null,
        experience_years: formData.experience_years || null,
        intensity: formData.intensity,
        flexibility: formData.flexibility,
        cycle_weeks: formData.cycle_weeks,
        updated_at: new Date().toISOString()
      }

      // Añadir campos opcionales básicos
      if (formData.ideal_for !== undefined) updateData.ideal_for = formData.ideal_for
      if (formData.offers !== undefined) updateData.offers = formData.offers
      if (formData.contact_phone !== undefined) updateData.contact_phone = formData.contact_phone || null
      if (formData.contact_email !== undefined) updateData.contact_email = formData.contact_email || null
      if (formData.avatar_url !== undefined) updateData.avatar_url = formData.avatar_url || null
      if (formData.social_handle !== undefined) updateData.social_handle = formData.social_handle || null
      
      // Combinar texto y URLs de archivos en social_proof
      let socialProofText = formData.social_proof || ''
      if (socialProofFiles.length > 0) {
        const fileUrls = socialProofFiles.map(f => f.url).join('\n')
        socialProofText = socialProofText ? `${socialProofText}\n\nArchivos:\n${fileUrls}` : `Archivos:\n${fileUrls}`
      }
      if (formData.social_proof !== undefined || socialProofFiles.length > 0) {
        updateData.social_proof = socialProofText || null
      }

      // Actualizar primero los campos básicos
      const { error: basicUpdateError } = await supabase
        .from('trainers')
        .update(updateData)
        .eq('id', trainer.id)

      if (basicUpdateError) {
        throw new Error(basicUpdateError.message || 'Error al actualizar el perfil')
      }
      
      // Guardar/actualizar certificados
      if (certificates && certificates.length > 0) {
        for (const cert of certificates) {
          // Saltar certificados temporales sin archivo
          if (cert.id && cert.id.toString().startsWith('temp-') && !cert.fileUrl) {
            continue
          }
          
          if (cert.id && typeof cert.id === 'string' && !cert.id.toString().startsWith('temp-') && !cert.id.toString().match(/^\d+$/)) {
            // Actualizar certificado existente (UUID)
            const { error: certError } = await supabase
              .from('trainer_certificates')
              .update({
                certificate_name: cert.name || '',
                issuing_organization: cert.organization || null,
                issue_date: cert.issueDate || null,
                expiry_date: cert.expiryDate || null,
                certificate_file_url: cert.fileUrl || null,
                certificate_file_name: cert.fileName || null
              })
              .eq('id', cert.id)
            
            if (certError) {
              console.error('Error actualizando certificado:', certError.message || certError.code || JSON.stringify(certError))
              // No lanzar error, solo loguear para no bloquear el guardado del resto
            }
          } else if (cert.fileUrl) {
            // Crear nuevo certificado
            const { error: certError } = await supabase
              .from('trainer_certificates')
              .insert({
                trainer_id: trainer.id,
                certificate_name: cert.name || '',
                issuing_organization: cert.organization || null,
                issue_date: cert.issueDate || null,
                expiry_date: cert.expiryDate || null,
                certificate_file_url: cert.fileUrl,
                certificate_file_name: cert.fileName || null,
                verification_status: 'pending'
              })
            
            if (certError) {
              console.error('Error creando certificado:', certError.message || certError.code || JSON.stringify(certError))
              // No lanzar error, solo loguear para no bloquear el guardado del resto
            }
          }
        }
      }

      // Intentar actualizar campos de redes sociales (pueden no existir)
      // Hacerlo en una actualización separada para no fallar si no existen
      try {
        const socialUpdateData: any = {}
        if (formData.instagram_url !== undefined) socialUpdateData.instagram_url = formData.instagram_url || null
        if (formData.website_url !== undefined) socialUpdateData.website_url = formData.website_url || null
        if (formData.youtube_url !== undefined) socialUpdateData.youtube_url = formData.youtube_url || null
        if (formData.twitter_url !== undefined) socialUpdateData.twitter_url = formData.twitter_url || null
        if (formData.tiktok_url !== undefined) socialUpdateData.tiktok_url = formData.tiktok_url || null

        // Solo intentar actualizar si hay campos de redes sociales
        if (Object.keys(socialUpdateData).length > 0) {
          const { error: socialUpdateError } = await supabase
            .from('trainers')
            .update(socialUpdateData)
            .eq('id', trainer.id)

          // Si falla por columnas que no existen, solo mostrar un warning, no un error
          if (socialUpdateError) {
            if (socialUpdateError.message?.includes('column') || socialUpdateError.code === '42703' || socialUpdateError.message?.includes('schema cache')) {
              console.warn('Campos de redes sociales no disponibles. Ejecuta add-trainer-social-fields.sql:', socialUpdateError)
              // No lanzar error, solo continuar sin actualizar esos campos
            } else {
              throw socialUpdateError
            }
          }
        }
      } catch (socialErr: any) {
        // Si es un error de columnas faltantes, ignorarlo silenciosamente
        if (socialErr?.message?.includes('column') || socialErr?.code === '42703' || socialErr?.message?.includes('schema cache')) {
          console.warn('Campos de redes sociales no disponibles. Ejecuta add-trainer-social-fields.sql')
        } else {
          // Si es otro tipo de error, lanzarlo
          throw socialErr
        }
      }

      // Limpiar datos guardados después de guardar exitosamente
      localStorage.removeItem('trainer-settings-form')
      
      setSuccess('Perfil actualizado correctamente')
      setTimeout(() => {
        router.push('/trainers/dashboard')
      }, 1500)
    } catch (err: any) {
      console.error('Error guardando:', err)
      // Mejorar el manejo de errores
      let errorMessage = 'Error al guardar el perfil'
      
      if (err?.message) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err?.error?.message) {
        errorMessage = err.error.message
      } else if (err?.code) {
        errorMessage = `Error ${err.code}: ${err.message || 'Error desconocido'}`
      }
      
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-[#F8FAFC]">Cargando...</div>
      </div>
    )
  }

  if (!trainer) {
    return null
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-b from-[#050509] via-[#050509] to-[#0A0A0B]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="mb-6">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#F8FAFC] mb-2">
            Editar perfil
          </h1>
          <p className="text-sm text-[#A7AFBE]">
            Personaliza cómo te ven los alumnos
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-[16px] bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* Form */}
        <div className="space-y-6">
          {/* Información básica */}
          <div className="rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-6">
            <h2 className="font-heading text-lg font-bold text-[#F8FAFC] mb-4">Información básica</h2>
            
            <div className="space-y-4">
              {/* Foto de perfil */}
              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Foto de perfil
                </label>
                <div className="flex items-center gap-4">
                  {formData.avatar_url ? (
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-[rgba(255,255,255,0.1)]">
                      <img
                        src={formData.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF2D2D] to-[#7F1D1D] flex items-center justify-center text-white font-heading font-bold text-2xl">
                      {formData.trainer_name[0] || 'T'}
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file || !user) return

                        // Leer el archivo como URL para el cropper
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          const imageSrc = event.target?.result as string
                          setFormData({ 
                            ...formData, 
                            showCropper: true, 
                            tempImageSrc: imageSrc 
                          })
                        }
                        reader.readAsDataURL(file)
                      }}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] text-[#F8FAFC] hover:bg-[#14161B] cursor-pointer transition-colors text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      {formData.uploadingAvatar ? 'Subiendo...' : formData.avatar_url ? 'Cambiar foto' : 'Subir foto'}
                    </label>
                    {formData.avatar_url && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar_url: '' })}
                        className="ml-2 text-xs text-[#FF2D2D] hover:text-[#FF3D3D]"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[#6B7280] mt-1">Recomendado: imagen cuadrada, mínimo 200x200px</p>
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2">
                  Nombre público <span className="text-[#FF2D2D]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.trainer_name}
                  onChange={(e) => setFormData({ ...formData, trainer_name: e.target.value })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                  placeholder="Tu nombre como entrenador"
                />
                <p className="text-xs text-[#6B7280] mt-1">Este nombre será visible públicamente y debe ser único</p>
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2">
                  Descripción breve
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                  placeholder="Tu especialidad o estilo en una frase"
                />
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2">
                  Filosofía de entrenamiento
                </label>
                <textarea
                  value={formData.philosophy}
                  onChange={(e) => setFormData({ ...formData, philosophy: e.target.value })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] min-h-[100px] resize-none"
                  placeholder="Tu filosofía, metodología, qué te hace diferente..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#A7AFBE] mb-2">
                    Especialidad
                  </label>
                  <input
                    type="text"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                    placeholder="Ej: Culturismo, Powerlifting..."
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#A7AFBE] mb-2">
                    Años de experiencia
                  </label>
                  <input
                    type="text"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                    className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                    placeholder="Ej: 5 años"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats editables */}
          <div className="rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-6">
            <h2 className="font-heading text-lg font-bold text-[#F8FAFC] mb-4">Estadísticas</h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Intensidad (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.intensity}
                  onChange={(e) => setFormData({ ...formData, intensity: parseInt(e.target.value) || 5 })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                />
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Flexibilidad (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.flexibility}
                  onChange={(e) => setFormData({ ...formData, flexibility: parseInt(e.target.value) || 5 })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                />
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Duración (semanas)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.cycle_weeks}
                  onChange={(e) => setFormData({ ...formData, cycle_weeks: parseInt(e.target.value) || 8 })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-6">
            <h2 className="font-heading text-lg font-bold text-[#F8FAFC] mb-4">Contacto (opcional)</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2">
                  Email de contacto
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                  placeholder="+34 600 000 000"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    Instagram (link completo)
                  </label>
                  <input
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                    className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                    placeholder="https://instagram.com/tuusuario"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                    placeholder="https://tusitio.com"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                    <Youtube className="w-4 h-4" />
                    YouTube (link completo)
                  </label>
                  <input
                    type="url"
                    value={formData.youtube_url}
                    onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                    className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                    placeholder="https://youtube.com/@tuusuario"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                    <Twitter className="w-4 h-4" />
                    Twitter/X (link completo)
                  </label>
                  <input
                    type="url"
                    value={formData.twitter_url}
                    onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                    className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                    placeholder="https://twitter.com/tuusuario"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Certificados */}
          <div className="rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-[#F8FAFC]">Certificados / Títulos</h2>
              <button
                type="button"
                onClick={() => {
                  const newCert = {
                    id: `temp-${Date.now()}`,
                    name: '',
                    organization: '',
                    issueDate: '',
                    expiryDate: '',
                    fileUrl: null,
                    fileName: null
                  }
                  setCertificates([...certificates, newCert])
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#FF2D2D] text-white text-sm font-medium hover:bg-[#FF3D3D] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Añadir certificado
              </button>
            </div>
            
            <p className="text-sm text-[#A7AFBE] mb-4">
              Sube archivos de tus certificados o títulos. Al menos uno es requerido para solicitar aparecer en público.
            </p>
            
            {certificates.length === 0 ? (
              <p className="text-xs text-[#6B7280] text-center py-6">
                No tienes certificados subidos. Añade al menos uno para solicitar aparecer en público.
              </p>
            ) : (
              <div className="space-y-3">
                {certificates.map((cert, index) => (
                  <div key={cert.id || index} className="rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-sm font-medium text-[#F8FAFC]">Certificado {index + 1}</h4>
                      <button
                        type="button"
                        onClick={async () => {
                          if (cert.id && typeof cert.id === 'string' && !cert.id.toString().match(/^\d+$/) && !cert.id.toString().startsWith('temp-')) {
                            // Eliminar de BD
                            const { error } = await supabase
                              .from('trainer_certificates')
                              .delete()
                              .eq('id', cert.id)
                            
                            if (!error) {
                              setCertificates(certificates.filter((c, i) => i !== index))
                            }
                          } else {
                            // Solo eliminar del estado local
                            setCertificates(certificates.filter((c, i) => i !== index))
                          }
                        }}
                        className="text-[#9CA3AF] hover:text-[#FF2D2D] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={cert.name}
                        onChange={(e) => {
                          const updated = [...certificates]
                          updated[index] = { ...updated[index], name: e.target.value }
                          setCertificates(updated)
                        }}
                        className="w-full rounded-[12px] bg-[#050509] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                        placeholder="Nombre del certificado"
                      />
                      <input
                        type="text"
                        value={cert.organization}
                        onChange={(e) => {
                          const updated = [...certificates]
                          updated[index] = { ...updated[index], organization: e.target.value }
                          setCertificates(updated)
                        }}
                        className="w-full rounded-[12px] bg-[#050509] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                        placeholder="Organización que lo emitió"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-[#A7AFBE] mb-1 block">Fecha de emisión</label>
                          <input
                            type="date"
                            value={cert.issueDate ? cert.issueDate.split('T')[0] : ''}
                            onChange={(e) => {
                              const updated = [...certificates]
                              updated[index] = { ...updated[index], issueDate: e.target.value }
                              setCertificates(updated)
                            }}
                            className="w-full rounded-[12px] bg-[#050509] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#A7AFBE] mb-1 block">Fecha de caducidad (opcional)</label>
                          <input
                            type="date"
                            value={cert.expiryDate ? cert.expiryDate.split('T')[0] : ''}
                            onChange={(e) => {
                              const updated = [...certificates]
                              updated[index] = { ...updated[index], expiryDate: e.target.value }
                              setCertificates(updated)
                            }}
                            className="w-full rounded-[12px] bg-[#050509] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                          />
                        </div>
                      </div>
                      <label className="block">
                        <span className="text-xs text-[#A7AFBE] mb-1 block">Archivo del certificado (PDF, JPG, PNG) <span className="text-[#FF2D2D]">*</span></span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file || !user) return
                            
                            setUploadingCert(true)
                            try {
                              const { data: { session } } = await supabase.auth.getSession()
                              if (!session) return
                              
                              const fileExt = file.name.split('.').pop()
                              const fileName = `${session.user.id}-${Date.now()}-${index}.${fileExt}`
                              const filePath = `${session.user.id}/${fileName}`
                              
                              const { error: uploadError } = await supabase.storage
                                .from('trainer-certificates')
                                .upload(filePath, file, {
                                  cacheControl: '3600',
                                  upsert: false
                                })
                              
                              if (uploadError) throw uploadError
                              
                              const { data: { publicUrl } } = supabase.storage
                                .from('trainer-certificates')
                                .getPublicUrl(filePath)
                              
                              const updated = [...certificates]
                              updated[index] = { 
                                ...updated[index], 
                                fileUrl: publicUrl,
                                fileName: file.name
                              }
                              setCertificates(updated)
                            } catch (err: any) {
                              console.error('Error subiendo certificado:', err)
                              setError(err.message || 'Error al subir el archivo')
                            } finally {
                              setUploadingCert(false)
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

          {/* Campos para solicitar público */}
          <div className="rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-6">
            <h2 className="font-heading text-lg font-bold text-[#F8FAFC] mb-2">Información para aparecer en público</h2>
            <p className="text-sm text-[#A7AFBE] mb-4">
              Estos campos son obligatorios si quieres solicitar aparecer como entrenador público.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Certificado/Título (archivo) <span className="text-[#FF2D2D]">*</span>
                </label>
                <p className="text-xs text-[#6B7280] mb-2">
                  Debes subir al menos un archivo de tu certificado o título. Ve a la sección "Certificados" arriba para añadirlos.
                </p>
                <p className="text-xs text-[#6B7280]">Requerido para solicitar aparecer en público</p>
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Usuario/Handle de redes sociales <span className="text-[#FF2D2D]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.social_handle}
                  onChange={(e) => setFormData({ ...formData, social_handle: e.target.value })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D]"
                  placeholder="Ej: @tuusuario (Instagram/TikTok/X)"
                />
                <p className="text-xs text-[#6B7280] mt-1">Al menos una red social (Instagram, TikTok o X). Requerido para solicitar aparecer en público</p>
              </div>

              <div>
                <label className="block text-sm text-[#A7AFBE] mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Clientes satisfechos / Prueba social <span className="text-[#FF2D2D]">*</span>
                </label>
                <textarea
                  value={formData.social_proof}
                  onChange={(e) => setFormData({ ...formData, social_proof: e.target.value })}
                  className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] min-h-[120px] resize-none"
                  placeholder="Cuéntanos sobre testimonios, resultados, número de clientes, links a reviews, o cualquier información que respalde tu validez como entrenador..."
                />
                
                {/* Archivos subidos */}
                {socialProofFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {socialProofFiles.map((file) => (
                      <div key={file.id} className="flex items-center gap-2 p-2 rounded-[12px] bg-[#050509] border border-[rgba(255,255,255,0.08)]">
                        {file.type === 'image' ? (
                          <img src={file.url} alt={file.fileName} className="w-12 h-12 object-cover rounded-lg" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#1A1D24] flex items-center justify-center">
                            <Upload className="w-6 h-6 text-[#A7AFBE]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#F8FAFC] truncate">{file.fileName}</p>
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#FF2D2D] hover:underline">
                            Ver archivo
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSocialProofFiles(socialProofFiles.filter(f => f.id !== file.id))
                          }}
                          className="text-[#9CA3AF] hover:text-[#FF2D2D] transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Input para subir archivos */}
                <div className="mt-3">
                  <label className="block">
                    <span className="text-xs text-[#A7AFBE] mb-1 block">Añadir imágenes o archivos (opcional)</span>
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || [])
                        if (!files.length || !user) return
                        
                        setUploadingSocialProof(true)
                        try {
                          const { data: { session } } = await supabase.auth.getSession()
                          if (!session) return
                          
                          // Verificar bucket
                          const { data: buckets } = await supabase.storage.listBuckets()
                          let socialProofBucket = buckets?.find(b => b.id === 'trainer-social-proof')
                          
                          if (!socialProofBucket) {
                            const setupResponse = await fetch('/api/storage/setup-bucket', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${session.access_token}`,
                              },
                              body: JSON.stringify({ bucketId: 'trainer-social-proof' }),
                            })
                            
                            if (!setupResponse.ok) {
                              setError('El bucket "trainer-social-proof" no existe. Ejecuta create-storage-buckets.sql')
                              setUploadingSocialProof(false)
                              return
                            }
                          }
                          
                          const uploadedFiles: typeof socialProofFiles = []
                          
                          for (const file of files) {
                            const fileExt = file.name.split('.').pop()
                            const fileName = `${session.user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                            const filePath = `${session.user.id}/${fileName}`
                            
                            const { error: uploadError } = await supabase.storage
                              .from('trainer-social-proof')
                              .upload(filePath, file, {
                                cacheControl: '3600',
                                upsert: false
                              })
                            
                            if (uploadError) {
                              console.error('Error subiendo archivo:', uploadError)
                              continue
                            }
                            
                            const { data: { publicUrl } } = supabase.storage
                              .from('trainer-social-proof')
                              .getPublicUrl(filePath)
                            
                            uploadedFiles.push({
                              id: Date.now().toString() + Math.random().toString(36),
                              url: publicUrl,
                              fileName: file.name,
                              type: file.type.startsWith('image/') ? 'image' : 'file'
                            })
                          }
                          
                          setSocialProofFiles([...socialProofFiles, ...uploadedFiles])
                        } catch (err: any) {
                          console.error('Error subiendo archivos:', err)
                          setError(err.message || 'Error al subir los archivos')
                        } finally {
                          setUploadingSocialProof(false)
                        }
                      }}
                      disabled={uploadingSocialProof}
                      className="w-full rounded-[12px] bg-[#050509] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] file:mr-4 file:py-1 file:px-2 file:rounded-[8px] file:border-0 file:text-xs file:font-medium file:bg-[#FF2D2D] file:text-white hover:file:bg-[#FF3D3D] disabled:opacity-50"
                    />
                    {uploadingSocialProof && (
                      <p className="text-xs text-[#A7AFBE] mt-1">Subiendo archivos...</p>
                    )}
                  </label>
                </div>
                
                <p className="text-xs text-[#6B7280] mt-2">
                  Puedes escribir texto y subir imágenes o archivos. Cuéntanos sobre testimonios, resultados o información que respalde tu validez como entrenador. Requerido para solicitar aparecer en público.
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving || !formData.trainer_name}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#FF2D2D] px-6 py-3 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <Link
              href="/trainers/dashboard"
              className="inline-flex items-center justify-center rounded-[18px] bg-transparent border border-[rgba(255,255,255,0.24)] px-6 py-3 text-sm font-medium text-[#F8FAFC] hover:border-[#FF2D2D]/70 transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </div>
      </div>
    </div>
    {formData.showCropper && formData.tempImageSrc && (
        <ImageCropper
          imageSrc={formData.tempImageSrc}
          onCrop={async (croppedImageUrl) => {
            try {
              setFormData(prev => ({ ...prev, uploadingAvatar: true, showCropper: false }))
              
              const { data: { session } } = await supabase.auth.getSession()
              if (!session) {
                setError('No hay sesión activa')
                setFormData(prev => ({ ...prev, uploadingAvatar: false, showCropper: true }))
                return
              }

              // Convertir la URL del blob a File
              const response = await fetch(croppedImageUrl)
              if (!response.ok) {
                throw new Error('Error al leer la imagen recortada')
              }
              
              const blob = await response.blob()
              const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })

              // Verificar bucket
              const { data: buckets } = await supabase.storage.listBuckets()
              const trainerAvatarsBucket = buckets?.find(b => b.id === 'trainer-avatars')
              
              if (!trainerAvatarsBucket) {
                const setupResponse = await fetch('/api/storage/setup-bucket', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ bucketId: 'trainer-avatars' }),
                })
                
                if (!setupResponse.ok) {
                  setError('El bucket "trainer-avatars" no existe. Ejecuta create-storage-buckets.sql')
                  setFormData(prev => ({ ...prev, uploadingAvatar: false, showCropper: true }))
                  return
                }
              }

              // Eliminar avatar anterior si existe
              try {
                const { data: existingFiles } = await supabase.storage
                  .from('trainer-avatars')
                  .list(session.user.id)
                
                if (existingFiles && existingFiles.length > 0) {
                  const filesToDelete = existingFiles.map(f => `${session.user.id}/${f.name}`)
                  await supabase.storage
                    .from('trainer-avatars')
                    .remove(filesToDelete)
                }
              } catch (deleteError) {
                // Ignorar errores al eliminar archivos antiguos
                console.warn('Error eliminando avatar anterior:', deleteError)
              }

              // Subir imagen recortada
              const fileName = `${Date.now()}.jpg`
              const filePath = `${session.user.id}/${fileName}`

              const { error: uploadError } = await supabase.storage
                .from('trainer-avatars')
                .upload(filePath, file, {
                  cacheControl: '3600',
                  upsert: false
                })

              if (uploadError) {
                console.error('Error de upload:', uploadError)
                throw new Error(uploadError.message || 'Error al subir la imagen')
              }

              // Obtener URL pública
              const { data: { publicUrl } } = supabase.storage
                .from('trainer-avatars')
                .getPublicUrl(filePath)

              // Limpiar URL temporal
              URL.revokeObjectURL(croppedImageUrl)

              // Actualizar el estado local
              setFormData(prev => ({ 
                ...prev, 
                avatar_url: publicUrl, 
                uploadingAvatar: false,
                tempImageSrc: ''
              }))
              
              // Guardar automáticamente en la BD para que persista
              const { error: saveError } = await supabase
                .from('trainers')
                .update({ 
                  avatar_url: publicUrl,
                  updated_at: new Date().toISOString()
                })
                .eq('id', trainer.id)
              
              if (saveError) {
                console.error('Error guardando avatar en BD:', saveError)
                setError('La foto se subió pero no se pudo guardar. Intenta guardar el perfil manualmente.')
              } else {
                // Actualizar el objeto trainer para que refleje el cambio
                setTrainer((prev: any) => prev ? { ...prev, avatar_url: publicUrl } : null)
                setSuccess('Foto de perfil actualizada y guardada correctamente')
              }
            } catch (err: any) {
              console.error('Error subiendo avatar:', err)
              setError(err.message || 'Error al subir la imagen')
              setFormData(prev => ({ ...prev, uploadingAvatar: false, showCropper: true }))
            }
          }}
          onCancel={() => {
            // Limpiar URL temporal si existe
            if (formData.tempImageSrc && formData.tempImageSrc.startsWith('blob:')) {
              URL.revokeObjectURL(formData.tempImageSrc)
            }
            setFormData({ ...formData, showCropper: false, tempImageSrc: '' })
          }}
        />
      )}
    </>
  )
}

