'use client'

import React, { useState, useEffect, useRef } from 'react'
import type { TrainerSetupQuestion } from '@/lib/personas'

type ChatMessage = {
  id: string
  author: 'trainer' | 'user'
  text: string
}

type TrainerSetupChatProps = {
  trainerName: string
  setupIntro: string
  setupQuestions: TrainerSetupQuestion[]
  onComplete: (answers: Record<string, string>) => Promise<void> | void
  enableFreeChat?: boolean // NEW, optional, defaults to false
}

type Phase = 'structured' | 'free' | 'final'

export function TrainerSetupChat({
  trainerName,
  setupIntro,
  setupQuestions,
  onComplete,
  enableFreeChat = false
}: TrainerSetupChatProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [inputValue, setInputValue] = useState('')
  const [phase, setPhase] = useState<Phase>('structured')
  const [freeUserMessages, setFreeUserMessages] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initialMessages: ChatMessage[] = [
      {
        id: 'intro',
        author: 'trainer',
        text: setupIntro
      }
    ]
    if (setupQuestions.length > 0) {
      initialMessages.push({
        id: 'question-0',
        author: 'trainer',
        text: setupQuestions[0].question
      })
    }
    return initialMessages
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputValue.trim()) {
      return
    }

    const trimmedValue = inputValue.trim()

    if (phase === 'structured' && currentIndex < setupQuestions.length) {
      const currentQuestion = setupQuestions[currentIndex]

      const newMessages: ChatMessage[] = [
        {
          id: `user-${currentIndex}`,
          author: 'user',
          text: trimmedValue
        }
      ]

      setMessages((prev) => [...prev, ...newMessages])

      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.field]: trimmedValue
      }))

      setInputValue('')
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)

      if (nextIndex < setupQuestions.length) {
        const nextQuestion = setupQuestions[nextIndex]
        setMessages((prev) => [
          ...prev,
          {
            id: `question-${nextIndex}`,
            author: 'trainer',
            text: nextQuestion.question
          }
        ])
      } else {
        // Last structured question answered
        if (enableFreeChat) {
          setMessages((prev) => [
            ...prev,
            {
              id: 'free-chat-intro',
              author: 'trainer',
              text:
                'Genial. Ahora, antes de cerrar, cuéntame con tus propias palabras qué quieres conseguir, qué no te gusta hacer o qué limitaciones tienes (lesiones, horarios, etc.). Puedes escribir varios mensajes y luego pulsar en "Listo, genera mi plan".'
            }
          ])
          setPhase('free')
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: 'completion',
              author: 'trainer',
              text: 'Perfecto, ya tengo todo lo que necesito para montarte el plan. Ahora voy a generarlo.'
            }
          ])
        }
      }
    } else if (phase === 'free') {
      // Free chat phase
      setMessages((prev) => [
        ...prev,
        {
          id: `free-user-${Date.now()}`,
          author: 'user',
          text: trimmedValue
        },
        {
          id: `free-trainer-${Date.now()}`,
          author: 'trainer',
          text: 'Perfecto, lo tengo en cuenta.'
        }
      ])

      setFreeUserMessages((prev) => [...prev, trimmedValue])
      setInputValue('')
    }
  }

  const handleGeneratePlan = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      if (enableFreeChat && phase === 'free') {
        // Build extraContext from free messages
        const extraContext = freeUserMessages
          .map((text, idx) => `Mensaje ${idx + 1}: ${text}`)
          .join('\n')

        const payload = {
          ...answers,
          extraContext
        }

        await onComplete(payload)
        setPhase('final')
      } else {
        await onComplete(answers)
      }
    } catch (error) {
      console.error('Error generating plan:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const showGenerateButton =
    (phase === 'structured' && currentIndex >= setupQuestions.length && !enableFreeChat) ||
    phase === 'free'

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold">Configura tu plan con {trainerName}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ maxHeight: '400px' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.author === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-[1.25rem] px-4 py-3 ${
                message.author === 'user'
                  ? 'bg-[#007AFF] text-white'
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
            </div>
          </div>
        ))}

        {isSubmitting && (
          <div className="flex justify-center">
            <div className="text-sm text-slate-500">Generando plan…</div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="border-t border-slate-200 p-4">
        {showGenerateButton ? (
          <div className="space-y-3">
            {phase === 'free' && (
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Escribe lo que quieras añadir..."
                  className="flex-1 rounded-[1.25rem] border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isSubmitting}
                  className="rounded-[1.25rem] bg-slate-200 text-slate-700 px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enviar
                </button>
              </form>
            )}
            <button
              onClick={handleGeneratePlan}
              disabled={isSubmitting}
              className="w-full rounded-[1.25rem] bg-[#007AFF] text-white px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Generando plan…'
                : phase === 'free'
                  ? 'Listo, genera mi plan'
                  : 'Generar plan de 9 semanas'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                currentIndex < setupQuestions.length
                  ? setupQuestions[currentIndex]?.placeholder
                  : 'Escribe tu respuesta...'
              }
              className="flex-1 rounded-[1.25rem] border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isSubmitting}
              className="rounded-[1.25rem] bg-[#007AFF] text-white px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

