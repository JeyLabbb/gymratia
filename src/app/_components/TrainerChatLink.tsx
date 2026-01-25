'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'
import { getTrainerBySlug } from '@/lib/personas'
import { SwitchTrainerModal } from './SwitchTrainerModal'
import { CreateStudentProfileModal } from './CreateStudentProfileModal'
import { cn } from '@/lib/utils'
import SafeImage from './SafeImage'

type TrainerChatLinkProps = {
  trainerSlug: string
  trainerName: string
  className?: string
  children: React.ReactNode
  variant?: 'button' | 'link'
}

export function TrainerChatLink({
  trainerSlug,
  trainerName,
  className,
  children,
  variant = 'button'
}: TrainerChatLinkProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [activeChats, setActiveChats] = useState<Array<{ slug: string; name: string }>>([])
  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false)
  const [hasStudentProfile, setHasStudentProfile] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [trainerAvatar, setTrainerAvatar] = useState<string | null>(null)

  useEffect(() => {
    if (user && !authLoading) {
      loadActiveChats()
      checkStudentProfile()
    }
  }, [user, authLoading])

  const checkStudentProfile = async () => {
    if (!user) {
      setHasStudentProfile(false)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setHasStudentProfile(false)
        return
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error verificando perfil de alumno:', error)
        setHasStudentProfile(false)
        return
      }

      setHasStudentProfile(!!profile)
    } catch (error) {
      console.error('Error verificando perfil:', error)
      setHasStudentProfile(false)
    }
  }

  // Cargar avatar del entrenador
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        // Buscar avatar con el slug del trainer (jey, edu, carolina son separados)
        const { data: trainerData } = await supabase
          .from('trainers')
          .select('avatar_url')
          .eq('slug', trainerSlug)
          .maybeSingle()
        
        if (trainerData?.avatar_url) {
          setTrainerAvatar(trainerData.avatar_url)
        }
      } catch (error) {
        console.error('Error loading trainer avatar:', error)
      }
    }
    
    loadAvatar()
  }, [trainerSlug])

  const loadActiveChats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/chat', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const chats = data.chats || []
        const trainerNames = chats
          .filter((chat: any) => {
            // Filtrar carolina (deshabilitada) y normalizar edu -> jey
            const normalized = chat.trainer_slug === 'edu' ? 'jey' : chat.trainer_slug
            return normalized === 'jey' || (normalized !== 'carolina' && getTrainerBySlug(normalized))
          })
          .map((chat: any) => {
            const normalized = chat.trainer_slug === 'edu' ? 'jey' : chat.trainer_slug
            const trainer = getTrainerBySlug(normalized)
            return {
              slug: normalized,
              name: trainer?.name || normalized
            }
          })
        setActiveChats(trainerNames)
      }
    } catch (error) {
      console.error('Error cargando chats:', error)
    }
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()

    // Si no está logueado, redirigir a login
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Verificar si tiene perfil de alumno
    // Si aún no se ha verificado, verificar ahora
    if (hasStudentProfile === null) {
      await checkStudentProfile()
    }
    
    // Si no tiene perfil de alumno, mostrar modal
    if (hasStudentProfile === false) {
      setShowCreateProfileModal(true)
      return
    }

    // Jey y Edu son entrenadores separados ahora
    // Verificar si ya tiene chat con este entrenador
    const hasChatWithThisTrainer = activeChats.some(
      chat => chat.slug === trainerSlug
    )

    // Si ya tiene chat con este entrenador, ir directo al chat
    if (hasChatWithThisTrainer) {
      // Buscar el chatId si existe
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const response = await fetch('/api/chat', {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          })
          if (response.ok) {
            const data = await response.json()
            const chats = data.chats || []
            const existingChat = chats.find((c: any) => 
              c.trainer_slug === trainerSlug
            )
            if (existingChat) {
              router.push(`/dashboard/chat/${trainerSlug}?chatId=${existingChat.id}`)
            } else {
              router.push(`/dashboard/chat/${trainerSlug}`)
            }
          } else {
            router.push(`/dashboard/chat/${trainerSlug}`)
          }
        } else {
          router.push(`/dashboard/chat/${trainerSlug}`)
        }
      } catch (error) {
        router.push(`/dashboard/chat/${trainerSlug}`)
      }
      return
    }

    // Si tiene chat con otro entrenador, mostrar modal de confirmación
    if (activeChats.length > 0) {
      const currentTrainer = activeChats[0]
      setShowSwitchModal(true)
      return
    }

    // Si no tiene ningún chat, ir directo
    router.push(`/dashboard/chat/${trainerSlug}`)
  }

  const handleConfirmSwitch = () => {
    router.push(`/dashboard/chat/${trainerSlug}`)
    setShowSwitchModal(false)
  }

  if (variant === 'link') {
    return (
      <>
        <a
          href={`/dashboard/chat/${trainerSlug}`}
          onClick={handleClick}
          className={className}
        >
          {children}
        </a>
        {showSwitchModal && activeChats.length > 0 && (
          <SwitchTrainerModal
            isOpen={showSwitchModal}
            onClose={() => setShowSwitchModal(false)}
            currentTrainer={activeChats[0]}
            newTrainer={{ slug: trainerSlug, name: trainerName }}
            onConfirm={handleConfirmSwitch}
          />
        )}
      </>
    )
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading || authLoading}
        className={cn(className, loading && 'opacity-50 cursor-not-allowed')}
      >
        {children}
      </button>
      {showSwitchModal && activeChats.length > 0 && (
        <SwitchTrainerModal
          isOpen={showSwitchModal}
          onClose={() => setShowSwitchModal(false)}
          currentTrainer={activeChats[0]}
          newTrainer={{ slug: trainerSlug, name: trainerName }}
          onConfirm={handleConfirmSwitch}
        />
      )}
      {showCreateProfileModal && (
        <CreateStudentProfileModal
          isOpen={showCreateProfileModal}
          onClose={() => setShowCreateProfileModal(false)}
        />
      )}
    </>
  )
}

