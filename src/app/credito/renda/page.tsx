'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MobileOnly } from '@/components/MobileOnly'
import { CashlyLogo } from '@/components/CashlyLogo'
import { JourneyProgress } from '@/components/JourneyProgress'
import { useJourneyStore } from '@/store/journey.store'
import { SessionGuard } from '@/components/SessionGuard'
import { useAbandonmentTracker } from '@/hooks/useAbandonmentTracker'
import { useEventTracker } from '@/hooks/useEventTracker'
import { useVisibilityTracker } from '@/hooks/useVisibilityTracker'
import { useHeartbeat } from '@/hooks/useHeartbeat'

// Logo Uber (wordmark oficial)
function UberLogo({ color = 'black' }: { color?: 'black' | 'white' }) {
  return (
    <svg viewBox="0 0 93 29" fill={color} className="w-16 h-auto">
      <path d="M11.4 23.1C5 23.1 0 18.3 0 11.6V0h4.8v11.3c0 4 2.7 7 6.6 7 4 0 6.7-3 6.7-7V0h4.8v11.6c0 6.7-5.1 11.5-11.5 11.5zm61.3-.2h-5l-9.2-9.8v9.8h-4.8V.5h4.8v9.3l9-9.3h5.5l-10 10.2 9.7 12.2zm-30.2 0V.5h15.3v4.1h-10.5v5h10.2v4.1h-10.2v5h10.5v4.2H42.5zm-18.8 0V.5h10c3.7 0 6.3 2.5 6.3 5.9 0 2.4-1.2 4.2-3.2 5.1 2.3.8 3.8 2.8 3.8 5.4 0 3.7-2.8 6-6.6 6H23.7zm5.8-13.7h3.7c1.4 0 2.3-.9 2.3-2.2 0-1.3-.9-2.2-2.3-2.2h-3.7v4.4zm0 9.4h4c1.6 0 2.6-1 2.6-2.4 0-1.4-1-2.4-2.6-2.4h-4v4.8z"/>
    </svg>
  )
}

// Logo 99 (circular amarelo oficial)
function Logo99({ inverted = false }: { inverted?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16">
      <circle cx="50" cy="50" r="50" fill={inverted ? '#000' : '#FFCC00'}/>
      <text
        x="50"
        y="65"
        textAnchor="middle"
        fontSize="45"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
        fill={inverted ? '#FFCC00' : '#000'}
      >
        99
      </text>
    </svg>
  )
}

export default function RendaPage() {
  return (
    <SessionGuard requiredStep="03">
      <RendaPageContent />
    </SessionGuard>
  )
}

function RendaPageContent() {
  const router = useRouter()
  const { journeyId, deviceInfo, setRendaInfo, setStep } = useJourneyStore()

  const [plataforma, setPlataforma] = useState<'uber' | '99' | ''>('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'form' | 'processing' | 'done' | 'error'>('form')
  const [error, setError] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)

  // Hooks de tracking
  const { logEvent, trackClick, trackStepCompleted } = useEventTracker('03')
  useVisibilityTracker('03')
  useAbandonmentTracker(journeyId, '03', isCompleted)
  useHeartbeat()

  const handleSelect = async (selected: 'uber' | '99') => {
    try {
      // Logar seleção de plataforma
      trackClick(`select_${selected}`, selected === 'uber' ? 'Uber' : '99')
      logEvent('platform_selected', { platform: selected })

      setPlataforma(selected)
      setIsLoading(true)
      setStatus('processing')
      setError('')

      // Simular processamento (MOCK)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock de dados de renda
      const mockRendaInfo = {
        plataforma: selected,
        dados_uber: selected === 'uber' ? {
          ativo: true,
          corridas_mes: 150,
          faturamento_medio: 4500,
          avaliacao: 4.85,
        } : undefined,
        dados_99: selected === '99' ? {
          ativo: true,
          corridas_mes: 120,
          faturamento_medio: 3800,
          avaliacao: 4.9,
        } : undefined,
        score: 750,
      }

      setRendaInfo(mockRendaInfo)
      setStatus('done')

      // Logar validação de renda
      logEvent('renda_validated', { platform: selected, score: 750 })
      trackStepCompleted()

      // Atualizar step no banco
      try {
        await fetch('/api/journey/step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            journeyId,
            step: '04',
            eventType: 'renda_validated'
          })
        })
      } catch (err) {
        console.error('Erro ao atualizar step:', err)
      }

      // Ir para oferta após breve delay
      setTimeout(() => {
        setIsCompleted(true)
        setStep('04')
        router.push('/credito/oferta')
      }, 1500)

    } catch (err) {
      console.error('Erro ao validar renda:', err)
      setError('Erro ao validar sua renda. Tente novamente.')
      setStatus('error')
      logEvent('renda_error', { platform: selected, error: String(err) })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setStatus('form')
    setError('')
    setPlataforma('')
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
          <JourneyProgress currentStep="03" completedSteps={['01', '02']} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 container-mobile flex flex-col justify-center">
          {status === 'form' && (
            <div className="card animate-slide-up">
              <h1 className="page-title text-center">Validação de renda</h1>
              <p className="page-subtitle text-center">
                Nessa etapa vamos avaliar seus ganhos na Uber e 99.
                <br />
                <strong>Escolha a plataforma com mais ganhos.</strong>
              </p>

              {/* Botões de seleção */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                {/* Botão Uber */}
                <button
                  onClick={() => handleSelect('uber')}
                  disabled={isLoading}
                  className={`
                    flex flex-col items-center justify-center p-6 rounded-2xl border-2
                    transition-all duration-300 transform hover:scale-105 active:scale-95
                    ${plataforma === 'uber'
                      ? 'border-black bg-black text-white shadow-lg'
                      : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-md'}
                  `}
                >
                  <div className="w-20 h-20 mb-3 flex items-center justify-center">
                    <UberLogo color={plataforma === 'uber' ? 'white' : 'black'} />
                  </div>
                  <span className={`text-xl font-bold ${plataforma === 'uber' ? 'text-white' : 'text-black'}`}>
                    Uber
                  </span>
                </button>

                {/* Botão 99 */}
                <button
                  onClick={() => handleSelect('99')}
                  disabled={isLoading}
                  className={`
                    flex flex-col items-center justify-center p-6 rounded-2xl border-2
                    transition-all duration-300 transform hover:scale-105 active:scale-95
                    ${plataforma === '99'
                      ? 'border-[#FFCC00] bg-[#FFCC00] text-black shadow-lg'
                      : 'border-gray-200 bg-white hover:border-[#FFCC00] hover:shadow-md'}
                  `}
                >
                  <div className="w-20 h-20 mb-3 flex items-center justify-center">
                    <Logo99 inverted={plataforma === '99'} />
                  </div>
                  <span className="text-xl font-bold text-black">
                    99
                  </span>
                </button>
              </div>

              <p className="text-xs text-text-secondary text-center mt-6">
                Seus dados serão usados apenas para validar sua renda
              </p>
            </div>
          )}

          {status === 'processing' && (
            <div className="card animate-fade-in text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h1 className="page-title">Validando sua renda</h1>
              <p className="text-text-secondary">
                Consultando dados na {plataforma === 'uber' ? 'Uber' : '99'}...
              </p>
            </div>
          )}

          {status === 'done' && (
            <div className="card animate-slide-up text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="page-title text-success">Renda validada!</h1>
              <p className="text-text-secondary">Preparando sua oferta...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="card animate-slide-up text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="page-title text-error">Erro na validação</h1>
              <p className="text-text-secondary mb-6">{error}</p>
              <button
                onClick={handleRetry}
                className="btn-primary"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </main>
    </MobileOnly>
  )
}
