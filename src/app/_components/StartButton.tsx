'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type StartButtonProps = {
  text?: string
  size?: 'md' | 'xl'
  showArrow?: boolean
  className?: string
}

export function StartButton({ 
  text = 'Comienza tu transformación', 
  size = 'xl',
  showArrow = true,
  className 
}: StartButtonProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  const handleClick = () => {
    if (loading) return

    // Marcar modo alumno antes de ir a login (para redirección correcta tras aceptar términos)
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_mode', 'student')
    }
    router.push('/auth/login')
  }

  const sizeClasses = {
    md: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center rounded-[16px] font-medium transition-all bg-[#FF2D2D] text-[#F8FAFC] hover:bg-[#FF3D3D] shadow-[0_0_40px_rgba(255,45,45,0.25)]',
        sizeClasses[size],
        className
      )}
    >
      {text}
      {showArrow && <ArrowRight className="ml-2 h-5 w-5" />}
    </button>
  )
}

