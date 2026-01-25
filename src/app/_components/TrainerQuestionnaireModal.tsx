'use client'

import { useState, useEffect } from 'react'
import { X, MessageSquare, Sparkles, Loader2, LogIn, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'
import { getTrainerBySlug } from '@/lib/personas'
import Link from 'next/link'

type TrainerQuestionnaireModalProps = {
  isOpen: boolean
  onClose: () => void
  trainerSlug: string
}

export function TrainerQuestionnaireModal({
  isOpen,
  onClose,
  trainerSlug
}: TrainerQuestionnaireModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  const trainer = getTrainerBySlug(trainerSlug)
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const questions = trainer?.setupQuestions || []

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
      setAnswers({})
      setSummary(null)
      setLoading(false)
    }
  }, [isOpen])

  // Si el usuario se loguea mientras el modal está abierto y completó el cuestionario, generar resumen
  useEffect(() => {
    if (isOpen && user && !summary && !loading && currentStep === questions.length - 1 && Object.keys(answers).length === questions.length) {
      // El usuario completó el cuestionario y ahora está logueado, generar resumen automáticamente
      const timer = setTimeout(() => {
        generateSummary()
      }, 500)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOpen, currentStep, answers])

  // Asegurar que currentAnswer siempre sea string
  const currentQuestion = questions[currentStep]
  const currentAnswer = currentQuestion ? (answers[currentQuestion.field] ?? '') : ''

  const handleAnswer = (value: string) => {
    if (currentStep < questions.length) {
      const question = questions[currentStep]
      setAnswers({ ...answers, [question.field]: value || '' })
    }
  }

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      generateSummary()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const generateSummary = async () => {
    if (!user || !trainer) {
      // No mostrar alert, el UI mostrará el mensaje de login
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        // No mostrar alert, el UI mostrará el mensaje de login
        return
      }

      // Llamar a API para generar resumen
      const response = await fetch('/api/trainer/questionnaire-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          trainerSlug,
          answers
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Error ${response.status}: ${response.statusText}`
        console.error('Error en respuesta:', errorMessage, errorData)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (!data.summary) {
        throw new Error('No se recibió el resumen del servidor')
      }

      setSummary(data.summary)
    } catch (error: any) {
      console.error('Error generando resumen:', error)
      const errorMessage = error?.message || 'Error desconocido al generar el resumen'
      // Mostrar error en UI en lugar de alert
      setSummary(`Error: ${errorMessage}. Por favor, intenta de nuevo o contacta con soporte.`)
    } finally {
      setLoading(false)
    }
  }

  const handleStartChat = () => {
    router.push(`/dashboard/chat/${trainerSlug}`)
    onClose()
  }

  if (!isOpen || !trainer) return null

  const isLastStep = currentStep === questions.length - 1
  const canProceed = currentAnswer && currentAnswer.trim().length > 0
  const showLoginRequired = isLastStep && !user && Object.keys(answers).length === questions.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-[24px] bg-[#14161B] border border-[rgba(255,255,255,0.12)] p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#1A1D24] transition-colors text-[#A7AFBE] hover:text-[#F8FAFC]"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <>
            {/* Loading State */}
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-6">
                <Loader2 className="w-12 h-12 text-[#FF2D2D] animate-spin" />
                <div className="absolute inset-0 bg-[#FF2D2D]/20 rounded-full blur-xl" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-[#F8FAFC] mb-2">
                {trainer.name} está pensando...
              </h3>
              <p className="text-sm text-[#A7AFBE] text-center max-w-sm">
                Generando tu resumen personalizado basado en tus respuestas
              </p>
            </div>
          </>
        ) : showLoginRequired ? (
          <>
            {/* Login Required State - Se muestra cuando está en último paso y no está logueado */}
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full bg-[#FFB020]/20 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-[#FFB020]" />
                </div>
              </div>
              <h3 className="font-heading text-xl font-bold text-[#F8FAFC] mb-2 text-center">
                Inicia sesión para continuar
              </h3>
              <p className="text-sm text-[#A7AFBE] text-center max-w-sm mb-6">
                Necesitas una cuenta para que {trainer.name} pueda generar tu resumen personalizado. Tus respuestas se guardarán.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-[16px] bg-transparent border border-[rgba(255,255,255,0.24)] px-4 py-3 text-sm font-medium text-[#F8FAFC] hover:border-[rgba(255,255,255,0.4)] transition-colors"
                >
                  Cerrar
                </button>
                <Link
                  href={`/auth/login?redirect=/trainers/${trainerSlug}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#FF2D2D] px-4 py-3 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Iniciar sesión
                </Link>
              </div>
            </div>
          </>
        ) : !summary ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#FF2D2D]/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-[#FF2D2D]" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-[#F8FAFC]">
                    Conoce a {trainer.name}
                  </h2>
                  <p className="text-sm text-[#A7AFBE]">
                    Paso {currentStep + 1} de {questions.length}
                  </p>
                </div>
              </div>
              <div className="w-full h-1.5 bg-[#1A1D24] rounded-full overflow-hidden mt-4">
                <div
                  className="h-full bg-gradient-to-r from-[#FF2D2D] to-[#FF5555] rounded-full transition-all"
                  style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            {currentQuestion && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-[#F8FAFC] mb-3">
                    {currentQuestion.question}
                  </h3>
                  {currentQuestion.helperText && (
                    <p className="text-sm text-[#A7AFBE] mb-4">{currentQuestion.helperText}</p>
                  )}
                  <input
                    type="text"
                    value={currentAnswer}
                    onChange={(e) => handleAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canProceed) {
                        handleNext()
                      }
                    }}
                    placeholder={currentQuestion.placeholder}
                    className="w-full rounded-[16px] bg-[#1A1D24] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] placeholder:text-[#6B7280]"
                    autoFocus
                  />
                </div>

                {/* Navigation */}
                <div className="flex gap-3">
                  {currentStep > 0 && (
                    <button
                      onClick={handleBack}
                      className="rounded-[16px] bg-transparent border border-[rgba(255,255,255,0.24)] px-4 py-3 text-sm font-medium text-[#F8FAFC] hover:border-[rgba(255,255,255,0.4)] transition-colors"
                    >
                      Atrás
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={!canProceed || loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#FF2D2D] px-4 py-3 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLastStep ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {loading ? 'Generando resumen...' : 'Ver resumen'}
                      </>
                    ) : (
                      'Siguiente'
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#22C55E]/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#22C55E]" />
                </div>
                <h2 className="font-heading text-xl font-bold text-[#F8FAFC]">
                  Tu resumen con {trainer.name}
                </h2>
              </div>
            </div>

            <div className="rounded-[16px] bg-[#0A0A0B] border border-[rgba(255,255,255,0.08)] p-6 mb-6">
              <div className="prose prose-invert max-w-none">
                <div className="text-[#E5E7EB] whitespace-pre-wrap leading-relaxed">
                  {summary}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-[16px] bg-transparent border border-[rgba(255,255,255,0.24)] px-4 py-3 text-sm font-medium text-[#F8FAFC] hover:border-[rgba(255,255,255,0.4)] transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={handleStartChat}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#FF2D2D] px-4 py-3 text-sm font-semibold text-white hover:bg-[#FF3D3D] transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Empezar a hablar con {trainer.name}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

