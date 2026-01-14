'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MobileOnly } from '@/components/MobileOnly'
import { CashlyLogo } from '@/components/CashlyLogo'
import { JourneyProgress } from '@/components/JourneyProgress'
import { useJourneyStore, useHydration } from '@/store/journey.store'
import { maskPhone } from '@/utils/validators'
import { useAbandonmentTracker } from '@/hooks/useAbandonmentTracker'
import { useHeartbeat } from '@/hooks/useHeartbeat'
import { usePreventBackNavigation } from '@/hooks/usePreventBackNavigation'
import { STEP_NAMES, getRouteForStep, JourneyStep } from '@/types/journey.types'

export default function OTPPage() {
  const router = useRouter()
  const hydrated = useHydration()
  const { journeyId, leadData, setOtpVerified, setStep } = useJourneyStore()

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Rastrear abandono - só dispara se não verificou OTP
  useAbandonmentTracker(journeyId, STEP_NAMES.OTP, isCompleted)
  useHeartbeat()
  usePreventBackNavigation()
  const hasSentOTP = useRef(false)

  // Redirecionar se não tiver dados (após hidratação)
  useEffect(() => {
    if (!hydrated) return
    if (!journeyId || !leadData) {
      router.replace('/')
    }
  }, [hydrated, journeyId, leadData, router])

  // Enviar OTP ao montar (apenas uma vez)
  useEffect(() => {
    if (journeyId && leadData?.telefone && !hasSentOTP.current) {
      hasSentOTP.current = true
      sendOTP()
    }
  }, [journeyId, leadData?.telefone]) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown para reenvio
  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      setCanResend(true)
    }
  }, [countdown, canResend])

  // WebOTP API - Auto-preenchimento de SMS
  useEffect(() => {
    // Verificar se WebOTP é suportado
    if (!('OTPCredential' in window)) {
      console.log('WebOTP API não suportada neste navegador')
      return
    }

    const abortController = new AbortController()

    // Solicitar OTP do navegador
    navigator.credentials.get({
      // @ts-expect-error - WebOTP types not in standard lib
      otp: { transport: ['sms'] },
      signal: abortController.signal,
    })
      .then((credential) => {
        const otpCredential = credential as unknown as { code?: string } | null
        if (otpCredential?.code) {
          const otpCode = otpCredential.code
          const digits = otpCode.split('')
          setCode(digits)
          // Auto-verificar
          verifyOTP(otpCode)
        }
      })
      .catch((err: Error) => {
        // Ignorar erros de abort (usuário cancelou ou componente desmontou)
        if (err.name !== 'AbortError') {
          console.log('WebOTP:', err.message)
        }
      })

    return () => abortController.abort()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sendOTP = async () => {
    if (!journeyId || !leadData?.telefone) return

    setIsSending(true)
    setError('')

    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId,
          phone: leadData.telefone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao enviar código')
        return
      }

      // Reset countdown
      setCountdown(60)
      setCanResend(false)

      // Em dev, mostrar código no console
      if (data.devCode) {
        console.log('🔐 Código OTP:', data.devCode)
      }
    } catch (err) {
      setError('Erro ao enviar código')
    } finally {
      setIsSending(false)
    }
  }

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    setError('')

    // Auto-focus próximo input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit quando completo
    if (newCode.every(d => d !== '') && newCode.join('').length === 6) {
      verifyOTP(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)

    if (pastedData.length === 6) {
      const newCode = pastedData.split('')
      setCode(newCode)
      verifyOTP(pastedData)
    }
  }

  const verifyOTP = async (otpCode: string) => {
    if (!journeyId) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId,
          code: otpCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Código inválido')
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }

      // Sucesso - marcar como completado antes de navegar
      setIsCompleted(true)
      setOtpVerified(true)

      // Usar step retornado pela API para redirecionar corretamente
      // Isso preserva o progresso quando OTP expira e usuário re-valida
      const targetStep = (data.currentStep || '02') as JourneyStep
      setStep(targetStep)

      // Redirecionar para a rota correspondente ao step atual
      const targetRoute = getRouteForStep(targetStep)
      console.log('[OTP] Redirecionando para:', targetRoute, '(step:', targetStep, ')')
      router.replace(targetRoute)

    } catch (err) {
      setError('Erro ao verificar código')
    } finally {
      setIsLoading(false)
    }
  }

  // Mostrar loading enquanto hidrata
  if (!hydrated) {
    return (
      <MobileOnly>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <svg className="animate-spin w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-text-secondary">Carregando...</p>
          </div>
        </div>
      </MobileOnly>
    )
  }

  if (!journeyId || !leadData) {
    return null
  }

  return (
    <MobileOnly>
      <main className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="pt-6 pb-2">
          <CashlyLogo size="sm" />
        </div>

        {/* Progress */}
        <div className="px-4">
          <JourneyProgress currentStep="01" />
        </div>

        {/* Conteúdo */}
        <div className="journey-content container-mobile">
          <div className="card animate-slide-up">
            <h1 className="page-title text-center">Verificação</h1>
            <p className="page-subtitle text-center">
              Digite o código enviado para
              <br />
              <span className="font-medium text-text-primary">
                {maskPhone(leadData.telefone)}
              </span>
            </p>

            {/* Inputs OTP */}
            <div className="flex justify-center gap-2 my-8" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="tel"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isLoading}
                  className={`
                    w-12 h-14 text-center text-2xl font-bold
                    border-2 rounded-xl
                    transition-all duration-200
                    focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                    ${error ? 'border-error' : 'border-gray-300'}
                    ${digit ? 'border-primary bg-primary/5' : ''}
                  `}
                />
              ))}
            </div>

            {/* Erro */}
            {error && (
              <p className="error-message text-center mb-4">
                <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 text-text-secondary mb-4">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verificando...
              </div>
            )}

            {/* Reenviar */}
            <div className="text-center">
              {canResend ? (
                <button
                  onClick={sendOTP}
                  disabled={isSending}
                  className="text-primary font-medium hover:underline"
                >
                  {isSending ? 'Enviando...' : 'Reenviar código'}
                </button>
              ) : (
                <p className="text-text-secondary text-sm">
                  Reenviar em <span className="font-medium">{countdown}s</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="py-4 text-center">
          <p className="text-xs text-text-secondary">
            Não recebeu? Verifique sua caixa de SMS
          </p>
        </div>
      </main>
    </MobileOnly>
  )
}
