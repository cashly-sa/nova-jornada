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
import { STEP_NAMES } from '@/types/journey.types'

// Logo Uber (ícone quadrado oficial)
function UberLogo({ inverted = false }: { inverted?: boolean }) {
  const bgColor = inverted ? '#fff' : '#000'
  const textColor = inverted ? '#000' : '#fff'
  return (
    <svg viewBox="0 0 96 96" className="w-16 h-16">
      <path fill={bgColor} fillRule="evenodd" d="M7.27,0H88.73A7.28,7.28,0,0,1,96,7.27V88.73A7.28,7.28,0,0,1,88.73,96H7.27A7.28,7.28,0,0,1,0,88.73V7.27A7.28,7.28,0,0,1,7.27,0Z"/>
      <path fill={textColor} d="M18.8,52.91A5.61,5.61,0,0,0,20,54.81,5,5,0,0,0,21.71,56a5.71,5.71,0,0,0,2.2.42,5.34,5.34,0,0,0,3.95-1.66A5.54,5.54,0,0,0,29,52.89a6.75,6.75,0,0,0,.42-2.44V36.54h3.38V59.07H29.48V57a7.77,7.77,0,0,1-2.65,1.83,8.41,8.41,0,0,1-3.3.65,8.89,8.89,0,0,1-3.36-.63A8,8,0,0,1,17.46,57a8.44,8.44,0,0,1-1.8-2.78A9.53,9.53,0,0,1,15,50.64V36.54h3.38V50.45a6.9,6.9,0,0,0,.42,2.46ZM77,46.68a4.34,4.34,0,0,0-1,3.06v9.33H72.73V42.66H76v2a4.54,4.54,0,0,1,1.59-1.58,4.45,4.45,0,0,1,2.33-.58H81v3H79.65A3.42,3.42,0,0,0,77,46.68Zm-22.08.9a8.87,8.87,0,0,1,1.77-2.72A8.29,8.29,0,0,1,59.38,43,8.69,8.69,0,0,1,66,43a7.69,7.69,0,0,1,2.61,1.79,8.18,8.18,0,0,1,1.71,2.7,9.37,9.37,0,0,1,.61,3.39v1.07H57.57a5.44,5.44,0,0,0,.65,1.85,5.74,5.74,0,0,0,1.2,1.48,5.9,5.9,0,0,0,1.64,1,5.52,5.52,0,0,0,1.95.35,5.62,5.62,0,0,0,4.73-2.41l2.35,1.74A8.55,8.55,0,0,1,63,59.42a9.1,9.1,0,0,1-3.43-.64A8.38,8.38,0,0,1,55,54.26a8.46,8.46,0,0,1-.68-3.4,8.63,8.63,0,0,1,.64-3.28Zm4.53-1.27a5.45,5.45,0,0,0-1.82,3h10a5.29,5.29,0,0,0-1.78-3,5.06,5.06,0,0,0-6.4,0ZM38.65,36.54v8.21A8.6,8.6,0,0,1,41.26,43a7.83,7.83,0,0,1,3.22-.66,8.65,8.65,0,0,1,6.11,2.51,8.77,8.77,0,0,1,1.83,2.74,8.26,8.26,0,0,1,.68,3.35,8.13,8.13,0,0,1-.68,3.33A8.8,8.8,0,0,1,50.59,57a8.65,8.65,0,0,1-6.11,2.51,8,8,0,0,1-3.24-.66A8.65,8.65,0,0,1,38.62,57v2.06H35.4V36.54ZM39,53.12a5.65,5.65,0,0,0,1.21,1.8A5.79,5.79,0,0,0,42,56.14a5.51,5.51,0,0,0,2.22.45,5.43,5.43,0,0,0,2.19-.45,5.74,5.74,0,0,0,1.79-1.22,6.16,6.16,0,0,0,1.2-1.8,5.51,5.51,0,0,0,.45-2.22,5.6,5.6,0,0,0-.45-2.24,6,6,0,0,0-1.2-1.82,5.55,5.55,0,0,0-1.79-1.21,5.64,5.64,0,0,0-6.18,1.21A5.88,5.88,0,0,0,39,48.66a5.6,5.6,0,0,0-.45,2.24A5.67,5.67,0,0,0,39,53.12Z"/>
    </svg>
  )
}

// Logo 99 (oficial simplificado com gradiente)
function Logo99({ inverted = false }: { inverted?: boolean }) {
  // Versão simplificada do logo 99 com gradiente oficial
  const bgGradient = inverted
    ? 'url(#grad99inv)'
    : 'url(#grad99)'
  const textColor = inverted ? '#fd0' : '#000'

  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16">
      <defs>
        <linearGradient id="grad99" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fd0"/>
          <stop offset="100%" stopColor="#ff8200"/>
        </linearGradient>
        <linearGradient id="grad99inv" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1a1a1a"/>
          <stop offset="100%" stopColor="#333"/>
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="90" height="90" rx="18" fill={bgGradient}/>
      <text
        x="50"
        y="68"
        textAnchor="middle"
        fontSize="52"
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={textColor}
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
  const { logEvent, trackClick, trackStepCompleted } = useEventTracker(STEP_NAMES.RENDA)
  useVisibilityTracker(STEP_NAMES.RENDA)
  useAbandonmentTracker(journeyId, STEP_NAMES.RENDA, isCompleted)
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
            step: '04'
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
        <div className="journey-content container-mobile">
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
                    <UberLogo inverted={plataforma === 'uber'} />
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
                      ? 'border-[#ff8200] bg-gradient-to-br from-[#fd0] to-[#ff8200] text-black shadow-lg'
                      : 'border-gray-200 bg-white hover:border-[#ff8200] hover:shadow-md'}
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
