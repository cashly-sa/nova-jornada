'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MobileOnly } from '@/components/MobileOnly'
import { CashlyLogo } from '@/components/CashlyLogo'
import { JourneyProgress } from '@/components/JourneyProgress'
import { useJourneyStore } from '@/store/journey.store'
import { formatCurrency } from '@/utils/validators'
import { SessionGuard } from '@/components/SessionGuard'
import { useAbandonmentTracker } from '@/hooks/useAbandonmentTracker'
import { useEventTracker } from '@/hooks/useEventTracker'
import { useVisibilityTracker } from '@/hooks/useVisibilityTracker'
import { useHeartbeat } from '@/hooks/useHeartbeat'

export default function OfertaPage() {
  return (
    <SessionGuard requiredStep="04">
      <OfertaPageContent />
    </SessionGuard>
  )
}

function OfertaPageContent() {
  const router = useRouter()
  const { journeyId, valorAprovado, deviceInfo, setStep } = useJourneyStore()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)
  const pageLoadTime = useRef<number>(Date.now())

  // Hooks de tracking
  const { logEvent, trackClick, trackStepCompleted } = useEventTracker('04')
  useVisibilityTracker('04')
  useAbandonmentTracker(journeyId, '04', isCompleted)
  useHeartbeat()

  // Logar visualização da oferta
  useEffect(() => {
    logEvent('oferta_viewed', {
      valor_aprovado: valorAprovado,
      parcelas: 12,
      taxa: 3.99
    })
  }, [logEvent, valorAprovado])

  const handleAccept = async () => {
    const tempoDecisao = Math.round((Date.now() - pageLoadTime.current) / 1000)

    try {
      trackClick('accept_offer', 'Aceitar oferta')
      logEvent('oferta_accepted', { tempo_decisao_seconds: tempoDecisao })

      setIsLoading(true)
      setError('')

      // Atualizar step no banco
      const response = await fetch('/api/journey/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId,
          step: '05',
          eventType: 'oferta_accepted'
        })
      })

      if (!response.ok) {
        throw new Error('Falha ao processar aceite')
      }

      trackStepCompleted()
      setIsCompleted(true)
      setStep('05')
      router.push('/credito/knox')

    } catch (err) {
      console.error('Erro ao aceitar oferta:', err)
      setError('Erro ao processar. Tente novamente.')
      logEvent('oferta_error', { error: String(err) })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = () => {
    const tempoDecisao = Math.round((Date.now() - pageLoadTime.current) / 1000)

    trackClick('reject_offer', 'Não tenho interesse')
    logEvent('oferta_rejected', { tempo_decisao_seconds: tempoDecisao })

    router.push('/')
  }

  // Cálculos de exemplo
  const taxaMensal = 3.99
  const parcelas = 12
  const valorParcela = valorAprovado
    ? Math.ceil((valorAprovado * (1 + (taxaMensal / 100) * parcelas)) / parcelas)
    : 0

  return (
    <MobileOnly>
      <main className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="pt-6 pb-2">
          <CashlyLogo size="sm" />
        </div>

        {/* Progress */}
        <div className="px-4">
          <JourneyProgress currentStep="04" completedSteps={['01', '02', '03']} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 container-mobile flex flex-col justify-center">
          <div className="card animate-slide-up">
            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 bg-success/10 text-success text-sm font-medium rounded-full mb-4">
                Pré-aprovado
              </span>
              <h1 className="page-title">Sua oferta de crédito</h1>
            </div>

            {/* Valor principal */}
            <div className="text-center py-6 mb-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl">
              <p className="text-sm text-text-secondary mb-1">Valor disponível</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-primary to-[#1DE9B6] bg-clip-text text-transparent">
                {formatCurrency(valorAprovado || 0)}
              </p>
            </div>

            {/* Detalhes */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-text-secondary">Taxa mensal</span>
                <span className="font-medium">{taxaMensal}% a.m.</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-text-secondary">Parcelas</span>
                <span className="font-medium">{parcelas}x</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-text-secondary">Valor da parcela</span>
                <span className="font-medium">{formatCurrency(valorParcela)}</span>
              </div>
              {deviceInfo && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-text-secondary">Garantia</span>
                  <span className="font-medium text-sm">{deviceInfo.modelo}</span>
                </div>
              )}
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg">
                <p className="text-error text-sm text-center flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {/* Botões */}
            <div className="space-y-3">
              <button
                onClick={handleAccept}
                disabled={isLoading}
                className="btn-primary"
              >
                {isLoading ? 'Processando...' : 'Aceitar oferta'}
              </button>

              <button
                onClick={handleReject}
                disabled={isLoading}
                className="w-full py-3 text-text-secondary hover:text-error transition-colors"
              >
                Não tenho interesse
              </button>
            </div>

            <p className="text-xs text-text-secondary text-center mt-4">
              Ao aceitar, você concorda com os termos e condições
            </p>
          </div>
        </div>
      </main>
    </MobileOnly>
  )
}
