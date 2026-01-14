'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionRecovery } from '@/hooks/useSessionRecovery'
import { getStepIndex, getRouteForStep } from '@/types/journey.types'
import type { JourneyStep } from '@/types/journey.types'

interface SessionGuardProps {
  children: React.ReactNode
  requiredStep: JourneyStep
  redirectTo?: string
}

function LoadingSpinner() {
  return (
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
  )
}

export function SessionGuard({
  children,
  requiredStep,
  redirectTo = '/',
}: SessionGuardProps) {
  const router = useRouter()
  const { isLoading, isValid, needsOtp, currentStep } = useSessionRecovery()

  useEffect(() => {
    // Aguardar carregamento
    if (isLoading) return

    // Sem sessão válida - redirecionar para início
    if (!isValid) {
      router.replace(redirectTo)
      return
    }

    // Precisa de OTP e não está na página de OTP
    if (needsOtp && requiredStep !== '01') {
      router.replace('/credito/otp')
      return
    }

    // Verificar se pode acessar o step requerido
    if (currentStep) {
      const currentIndex = getStepIndex(currentStep)
      const requiredIndex = getStepIndex(requiredStep)

      // Não pode acessar step futuro
      if (requiredIndex > currentIndex) {
        // Redirecionar para o step atual
        router.replace(getRouteForStep(currentStep))
        return
      }
    }
  }, [isLoading, isValid, needsOtp, currentStep, requiredStep, redirectTo, router])

  // Mostrar loading enquanto verifica
  if (isLoading) {
    return <LoadingSpinner />
  }

  // Sem sessão válida - não renderizar (vai redirecionar)
  if (!isValid) {
    return <LoadingSpinner />
  }

  // Precisa de OTP e não está na página de OTP - não renderizar
  if (needsOtp && requiredStep !== '01') {
    return <LoadingSpinner />
  }

  // Verificar acesso ao step
  if (currentStep) {
    const currentIndex = getStepIndex(currentStep)
    const requiredIndex = getStepIndex(requiredStep)

    if (requiredIndex > currentIndex) {
      return <LoadingSpinner />
    }
  }

  // Tudo OK - renderizar children
  return <>{children}</>
}
