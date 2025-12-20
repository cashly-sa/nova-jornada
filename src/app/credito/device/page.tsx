'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MobileOnly } from '@/components/MobileOnly'
import { CashlyLogo } from '@/components/CashlyLogo'
import { JourneyProgress } from '@/components/JourneyProgress'
import { useJourneyStore } from '@/store/journey.store'
import { detectDevice } from '@/lib/device-detection'
import { formatCurrency } from '@/utils/validators'
import { useAbandonmentTracker } from '@/hooks/useAbandonmentTracker'
import { SessionGuard } from '@/components/SessionGuard'

type Status = 'detecting' | 'eligible' | 'not_eligible' | 'error'

export default function DevicePage() {
  return (
    <SessionGuard requiredStep="device">
      <DevicePageContent />
    </SessionGuard>
  )
}

function DevicePageContent() {
  const router = useRouter()
  const { journeyId, otpVerified, setDeviceInfo, setValorAprovado, setStep } = useJourneyStore()

  const [status, setStatus] = useState<Status>('detecting')
  const [deviceName, setDeviceName] = useState('')
  const [valorAprovado, setValor] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)

  // Ref para evitar chamadas duplicadas (React StrictMode)
  const hasValidated = useRef(false)

  // Rastrear abandono - só dispara se não clicou em continuar
  useAbandonmentTracker(journeyId, 'device', isCompleted)

  // Detectar dispositivo automaticamente (apenas uma vez)
  useEffect(() => {
    if (journeyId && otpVerified && !hasValidated.current) {
      hasValidated.current = true
      detectAndValidate()
    }
  }, [journeyId, otpVerified]) // eslint-disable-line react-hooks/exhaustive-deps

  const detectAndValidate = async () => {
    setStatus('detecting')
    setError('')

    try {
      // Detectar dispositivo
      const deviceInfo = await detectDevice()

      // Validar via API
      const response = await fetch('/api/device/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId,
          modelo: deviceInfo.modelo,
          fabricante: deviceInfo.fabricante,
          userAgent: deviceInfo.userAgent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao verificar dispositivo')
        setStatus('error')
        return
      }

      // Salvar no store
      setDeviceInfo(deviceInfo)

      if (data.eligible) {
        setDeviceName(data.nomeComercial || data.modelo)
        setValor(data.valorAprovado)
        setValorAprovado(data.valorAprovado)
        setStatus('eligible')
      } else {
        setDeviceName(deviceInfo.modelo)
        setStatus('not_eligible')
      }

    } catch (err) {
      console.error('Erro na detecção:', err)
      setError('Erro ao detectar dispositivo')
      setStatus('error')
    }
  }

  const handleContinue = () => {
    setIsCompleted(true)
    setStep('renda')
    router.push('/credito/renda')
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
          <JourneyProgress currentStep="device" completedSteps={['otp']} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 container-mobile flex flex-col justify-center">
          {status === 'detecting' && (
            <div className="card animate-fade-in text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="page-title">Verificando seu celular</h1>
              <p className="text-text-secondary">Aguarde enquanto identificamos seu dispositivo...</p>
              <div className="mt-6 flex justify-center">
                <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            </div>
          )}

          {status === 'eligible' && (
            <div className="card animate-slide-up text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="page-title text-success">Celular aprovado!</h1>
              <p className="text-text-secondary mb-2">{deviceName}</p>

              {valorAprovado && (
                <div className="my-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <p className="text-sm text-text-secondary mb-1">Valor pré-aprovado</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(valorAprovado)}
                  </p>
                </div>
              )}

              <button onClick={handleContinue} className="btn-primary">
                Continuar
              </button>
            </div>
          )}

          {status === 'not_eligible' && (
            <div className="card animate-slide-up text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="page-title text-error">Dispositivo não elegível</h1>
              <p className="text-text-secondary mb-2">
                Infelizmente seu dispositivo não é compatível com nosso programa de crédito.
              </p>
              {deviceName && deviceName !== 'unknown' && (
                <p className="text-sm text-text-secondary mb-6">
                  Dispositivo: {deviceName}
                </p>
              )}
              <button
                onClick={() => router.push('/')}
                className="btn-secondary"
              >
                Voltar ao início
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="card animate-slide-up text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="page-title">Erro na verificação</h1>
              <p className="text-text-secondary mb-6">{error}</p>
              <button onClick={detectAndValidate} className="btn-primary">
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </main>
    </MobileOnly>
  )
}
