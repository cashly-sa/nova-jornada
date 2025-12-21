'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MobileOnly } from '@/components/MobileOnly'
import { CashlyLogo } from '@/components/CashlyLogo'
import { JourneyProgress } from '@/components/JourneyProgress'
import { useJourneyStore, useHydration } from '@/store/journey.store'
import { detectDevice } from '@/lib/device-detection'
import { useAbandonmentTracker } from '@/hooks/useAbandonmentTracker'
import { useHeartbeat } from '@/hooks/useHeartbeat'
import { useEventTracker } from '@/hooks/useEventTracker'
import { SessionGuard } from '@/components/SessionGuard'

type Status = 'detecting' | 'eligible' | 'not_eligible' | 'share_link' | 'error'

export default function DevicePage() {
  return (
    <SessionGuard requiredStep="02">
      <DevicePageContent />
    </SessionGuard>
  )
}

function DevicePageContent() {
  const router = useRouter()
  const hydrated = useHydration()
  const { journeyId, token, setDeviceInfo, setValorAprovado, setStep } = useJourneyStore()

  const [status, setStatus] = useState<Status>('detecting')
  const [deviceName, setDeviceName] = useState('')
  const [valorAprovado, setValor] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)
  const [copied, setCopied] = useState(false)

  // Ref para evitar chamadas duplicadas (React StrictMode)
  const hasValidated = useRef(false)

  // Hooks de tracking
  const { logEvent, trackClick, trackStepCompleted } = useEventTracker('02')
  useAbandonmentTracker(journeyId, '02', isCompleted)
  useHeartbeat()

  // Link compartilhável (placeholder fake por enquanto)
  const shareableLink = `https://cashly.app/c/${token?.slice(0, 8) || 'demo'}${token ? token.slice(-4) : ''}`

  // Detectar dispositivo automaticamente (apenas uma vez, após hidratação)
  useEffect(() => {
    if (hydrated && journeyId && !hasValidated.current) {
      hasValidated.current = true
      detectAndValidate()
    }
  }, [hydrated, journeyId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleContinue = async () => {
    trackClick('continue', 'Continuar')
    logEvent('plan_approval', { valor_aprovado: valorAprovado })
    trackStepCompleted()

    // Atualizar step no banco antes de navegar
    try {
      const response = await fetch('/api/journey/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId,
          step: '03'
        })
      })

      if (!response.ok) {
        console.error('Erro ao atualizar step')
        return
      }
    } catch (err) {
      console.error('Erro ao atualizar step:', err)
      return
    }

    setIsCompleted(true)
    setStep('03')
    router.push('/credito/renda')
  }

  const handleTryAnotherDevice = () => {
    trackClick('try_another_device', 'Quero tentar com outro modelo')
    logEvent('try_another_device', { original_device: deviceName })
    setStatus('share_link')
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink)
      setCopied(true)
      logEvent('link_copied', { link: shareableLink })

      // Reset após 2s
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  const handleShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cashly - Crédito com garantia de celular',
          text: 'Use esse link para solicitar crédito:',
          url: shareableLink,
        })
        logEvent('link_shared', { method: 'native_share' })
      } catch (err) {
        // Usuário cancelou ou erro
        console.log('Share cancelled or failed:', err)
      }
    } else {
      // Fallback: copiar link
      handleCopyLink()
    }
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
          <JourneyProgress currentStep="02" completedSteps={['01']} />
        </div>

        {/* Conteúdo */}
        <div className="journey-content container-mobile">
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
              <p className="text-text-secondary mb-6">
                Seu modelo de celular <span className="font-semibold text-text-primary">{deviceName}</span> é elegível
              </p>
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
              <h1 className="text-xl font-bold text-text-primary mb-6">
                Infelizmente seu modelo de celular não é elegível
              </h1>
              <button
                onClick={handleTryAnotherDevice}
                className="btn-primary"
              >
                Quero tentar com outro modelo
              </button>
            </div>
          )}

          {status === 'share_link' && (
            <div className="card animate-slide-up text-center">
              {/* Ícone de compartilhar */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>

              {/* Título */}
              <h1 className="page-title">Compartilhe o link</h1>

              {/* Mensagem */}
              <p className="text-text-secondary mb-6">
                Use esse link para tentar aprovação em outro modelo de celular
              </p>

              {/* Caixa do link estilo Pix */}
              <div className="bg-gray-100 rounded-xl p-4 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs text-text-secondary mb-1">Link de indicação</p>
                    <p className="text-sm font-mono text-text-primary truncate">
                      cashly.app/c/{token?.slice(0, 8) || '••••••••'}••••
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="space-y-3">
                <button
                  onClick={handleCopyLink}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copied ? 'Link copiado!' : 'Copiar Link'}
                </button>

                <button
                  onClick={handleShareLink}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Compartilhar Link
                </button>
              </div>
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
