'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MobileOnly } from '@/components/MobileOnly'
import { CashlyLogo } from '@/components/CashlyLogo'
import { JourneyProgress } from '@/components/JourneyProgress'
import { useJourneyStore, useHydration } from '@/store/journey.store'
import { detectDeviceWith51Degrees } from '@/lib/device-detection'
import { useAbandonmentTracker } from '@/hooks/useAbandonmentTracker'
import { useHeartbeat } from '@/hooks/useHeartbeat'
import { useEventTracker } from '@/hooks/useEventTracker'
import { usePreventBackNavigation } from '@/hooks/usePreventBackNavigation'
import { SessionGuard } from '@/components/SessionGuard'
import { STEP_NAMES } from '@/types/journey.types'

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
  const [attempts, setAttempts] = useState(0)

  // Ref para evitar chamadas duplicadas (React StrictMode)
  const hasValidated = useRef(false)

  // Hooks de tracking
  const { logEvent, trackClick, trackStepCompleted } = useEventTracker(STEP_NAMES.DEVICE)
  useAbandonmentTracker(journeyId, STEP_NAMES.DEVICE, isCompleted)
  useHeartbeat()
  usePreventBackNavigation()

  // Link compartilhável (placeholder fake por enquanto)
  const shareableLink = `https://cashly.app/c/${token?.slice(0, 8) || 'demo'}${token ? token.slice(-4) : ''}`

  // Verificar estado anterior e decidir se precisa validar novamente
  useEffect(() => {
    if (hydrated && journeyId && token && !hasValidated.current) {
      hasValidated.current = true
      checkPreviousState()
    }
  }, [hydrated, journeyId, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Verificar se já existe resultado anterior
  const checkPreviousState = async () => {
    console.log('🔍 [Device] checkPreviousState iniciado')

    try {
      // Buscar estado atual da jornada
      const response = await fetch('/api/journey/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      console.log('🔍 [Device] Resposta validate:', JSON.stringify({
        valid: data.valid,
        deviceApproved: data.journey?.deviceApproved,
        deviceAttempts: data.journey?.deviceAttempts,
        deviceInfo: data.journey?.deviceInfo,
      }))

      if (data.valid && data.journey) {
        const { deviceApproved, deviceAttempts, deviceInfo, valorAprovado: savedValor } = data.journey

        console.log('🔍 [Device] Verificando condições:', {
          deviceApproved,
          deviceAttempts,
          hasDeviceInfo: !!deviceInfo,
          conditionApproved: deviceApproved && deviceInfo,
          conditionRejected: deviceAttempts > 0 && !deviceApproved,
        })

        // Se device já foi verificado e APROVADO, mostrar resultado
        if (deviceApproved && deviceInfo) {
          console.log('✅ [Device] Device aprovado anteriormente')
          setDeviceName(deviceInfo.modelo)
          setValor(savedValor)
          setValorAprovado(savedValor)
          setStatus('eligible')
          return
        }

        // Se device foi verificado mas REJEITADO, mostrar tela de rejeitado
        // deviceInfo pode não estar presente se o modelo não foi salvo corretamente
        if (deviceAttempts > 0 && !deviceApproved) {
          console.log('❌ [Device] Device rejeitado anteriormente, tentativas:', deviceAttempts)
          if (deviceInfo) {
            setDeviceName(deviceInfo.modelo)
          }
          setAttempts(deviceAttempts)
          setStatus('not_eligible')
          return
        }
      }

      // Se não tem resultado anterior, fazer detecção normal
      console.log('🔄 [Device] Nenhum estado anterior, chamando detectAndValidate()')
      detectAndValidate()
    } catch (err) {
      console.error('❌ [Device] Erro ao verificar estado anterior:', err)
      // Em caso de erro, tentar detecção normal
      detectAndValidate()
    }
  }

  const detectAndValidate = async () => {
    setStatus('detecting')
    setError('')

    try {
      // Detectar dispositivo usando 51Degrees API
      const deviceInfo = await detectDeviceWith51Degrees()

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
        setAttempts(data.attempts || 1)
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
    router.replace('/credito/renda')
  }

  const handleTryAnotherDevice = () => {
    trackClick('try_another_device', 'Quero tentar com outro modelo')
    logEvent('try_another_device', { original_device: deviceName })
    setStatus('share_link')
  }

  const handleCopyLink = async () => {
    try {
      // Tentar usar Clipboard API moderna
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareableLink)
      } else {
        // Fallback para dispositivos sem suporte
        const textArea = document.createElement('textarea')
        textArea.value = shareableLink
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }

      setCopied(true)

      // Log evento (fire-and-forget via Beacon API)
      logEvent('link_copied', { link: shareableLink })

      // Reset após 2s
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar:', err)
      // Mostrar feedback mesmo se falhar
      alert('Não foi possível copiar. Link: ' + shareableLink)
    }
  }

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Olha esse link para solicitar crédito na Cashly: ${shareableLink}`)
    const whatsappUrl = `https://wa.me/?text=${text}`

    // Log evento (fire-and-forget via Beacon API)
    logEvent('link_shared', { method: 'whatsapp' })

    // Abrir WhatsApp
    window.open(whatsappUrl, '_blank')
  }

  const handleShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cashly - Crédito com garantia de celular',
          text: 'Use esse link para solicitar crédito:',
          url: shareableLink,
        })
        // Log evento (fire-and-forget via Beacon API)
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
              <h1 className="text-xl font-bold text-text-primary mb-2">
                Infelizmente seu modelo de celular não é elegível
              </h1>
              {deviceName && (
                <p className="text-text-secondary text-sm mb-2">
                  Modelo detectado: <span className="font-medium">{deviceName}</span>
                </p>
              )}
              {attempts > 0 && (
                <p className="text-text-secondary text-sm mb-6">
                  Tentativa {attempts}
                </p>
              )}
              {!attempts && <div className="mb-6" />}
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
              <h1 className="page-title">Use esse link em outro aparelho</h1>

              {/* Mensagem */}
              <p className="text-text-secondary mb-6">
                Não aceitamos Iphone e modelos antigos e obsoletos.
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
                {/* Copiar Link - Botão primário */}
                <button
                  onClick={handleCopyLink}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copied ? 'Link copiado!' : 'Copiar Link'}
                </button>

                {/* WhatsApp - Botão secundário verde */}
                <button
                  onClick={handleWhatsAppShare}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Compartilhar pelo WhatsApp
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
