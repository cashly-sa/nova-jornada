'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MobileOnly } from '@/components/MobileOnly'
import { CashlyLogo } from '@/components/CashlyLogo'
import { formatCPF, validateCPF } from '@/utils/validators'
import { checkCPF, createJourney, getActiveJourneyByLeadId } from '@/lib/supabase'
import { useJourneyStore } from '@/store/journey.store'
import { detectDevice } from '@/lib/device-detection'
import { useSessionRecovery } from '@/hooks/useSessionRecovery'
import { getRouteForStep } from '@/types/journey.types'

export default function CPFPage() {
  const router = useRouter()
  const { setCpf, setLeadData, setJourneyData, setStep } = useJourneyStore()
  const { isLoading: isCheckingSession, isValid, needsOtp, currentStep } = useSessionRecovery()

  const [cpf, setCpfValue] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidCPF, setIsValidCPF] = useState<boolean | null>(null)

  // Redirecionar se já tem sessão válida
  useEffect(() => {
    if (isCheckingSession) return

    if (isValid && currentStep && currentStep !== '00') {
      if (needsOtp) {
        // Sessão válida mas OTP expirou - ir para OTP
        router.push('/credito/otp')
      } else {
        // Sessão válida - ir para step atual
        router.push(getRouteForStep(currentStep))
      }
    }
  }, [isCheckingSession, isValid, needsOtp, currentStep, router])

  const handleCpfChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value)
    setCpfValue(formatted)
    setError('')

    // Validar CPF em tempo real quando tiver 11 dígitos
    const cleanCPF = formatted.replace(/\D/g, '')
    if (cleanCPF.length === 11) {
      const valid = validateCPF(cleanCPF)
      setIsValidCPF(valid)
      if (!valid) {
        setError('CPF inválido')
      }
    } else {
      setIsValidCPF(null)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanCPF = cpf.replace(/\D/g, '')

    // Validar CPF
    if (!validateCPF(cleanCPF)) {
      setError('CPF inválido')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Verificar se CPF existe
      const result = await checkCPF(cleanCPF)

      // Salvar CPF no store
      setCpf(cleanCPF)

      if (!result.exists) {
        // CPF não existe - ir para cadastro
        setStep('00b')
        router.push('/cadastro')
      } else {
        // CPF existe
        if (result.blacklist) {
          setError('Acesso indisponível')
          return
        }

        // Salvar dados do lead
        setLeadData({
          id: result.leadId!,
          cpf: cleanCPF,
          nome: '',
          telefone: result.telefone || '',
          blacklist: false,
        })

        // Detectar device atual para buscar jornada do mesmo device
        const currentDevice = await detectDevice()
        console.log('📱 Device detectado:', currentDevice.modelo)

        // Verificar se já existe jornada ativa para este lead + device
        console.log('🔍 Buscando jornada existente para leadId:', result.leadId, 'modelo:', currentDevice.modelo)
        const existingJourney = await getActiveJourneyByLeadId(result.leadId!, currentDevice.modelo)
        console.log('📋 Jornada encontrada:', existingJourney)

        let journeyId: number
        let journeyToken: string

        if (existingJourney) {
          console.log('♻️ Reutilizando jornada existente:', existingJourney.id)
          journeyId = existingJourney.id
          journeyToken = existingJourney.token
        } else {
          // Só cria nova jornada se não existir uma ativa para este device
          console.log('🆕 Device diferente ou nova jornada, criando...')
          const newJourney = await createJourney(result.leadId!)
          console.log('✅ Nova jornada criada:', newJourney.id)
          journeyId = newJourney.id
          journeyToken = newJourney.token
        }

        setJourneyData(journeyId, journeyToken)
        setStep('01')

        // Ir para OTP
        router.push('/credito/otp')
      }
    } catch (err) {
      console.error('Erro:', err)
      setError('Erro ao verificar CPF. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Mostrar loading enquanto verifica sessão
  if (isCheckingSession) {
    return (
      <MobileOnly>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="animate-spin w-10 h-10 text-primary"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-text-secondary">Carregando...</p>
          </div>
        </div>
      </MobileOnly>
    )
  }

  // Se tem sessão válida, não mostrar nada (vai redirecionar)
  if (isValid && currentStep && currentStep !== '00') {
    return (
      <MobileOnly>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="animate-spin w-10 h-10 text-primary"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-text-secondary">Carregando...</p>
          </div>
        </div>
      </MobileOnly>
    )
  }

  return (
    <MobileOnly>
      <main className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="pt-8 pb-4">
          <CashlyLogo size="md" />
        </div>

        {/* Conteúdo */}
        <div className="journey-content container-mobile">
          <div className="card animate-slide-up">
            <h1 className="page-title text-center">Solicite seu crédito</h1>
            <p className="page-subtitle text-center">
              Digite seu CPF para começar
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="cpf" className="label">
                  CPF
                </label>
                <input
                  id="cpf"
                  type="tel"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCpfChange}
                  className={`input-field ${
                    error
                      ? 'border-error focus:border-error focus:ring-error/20'
                      : isValidCPF === true
                        ? 'border-success focus:border-success focus:ring-success/20'
                        : ''
                  }`}
                  maxLength={14}
                  disabled={isLoading}
                  autoComplete="off"
                />
                {error && (
                  <p className="error-message">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={cpf.length < 14 || isLoading || isValidCPF === false}
                className="btn-primary"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Verificando...
                  </span>
                ) : (
                  'Continuar'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="py-4 text-center">
          <p className="text-xs text-text-secondary">
            Seus dados estão protegidos
          </p>
        </div>

        {/* Build Info - Ambiente de Testes */}
        {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 text-white text-[10px] px-2 py-1">
            <div className="flex justify-between items-center">
              <span className="font-mono">
                {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7)}
              </span>
              <span className="truncate max-w-[200px]">
                {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE || 'N/A'}
              </span>
            </div>
          </div>
        )}
      </main>
    </MobileOnly>
  )
}
