'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileOnly } from '@/components/MobileOnly'
import { CashlyLogo } from '@/components/CashlyLogo'
import { JourneyProgress } from '@/components/JourneyProgress'
import { useJourneyStore } from '@/store/journey.store'
import { formatCurrency } from '@/utils/validators'
import { SessionGuard } from '@/components/SessionGuard'
import { useAbandonmentTracker } from '@/hooks/useAbandonmentTracker'

export default function OfertaPage() {
  return (
    <SessionGuard requiredStep="oferta">
      <OfertaPageContent />
    </SessionGuard>
  )
}

function OfertaPageContent() {
  const router = useRouter()
  const { journeyId, valorAprovado, deviceInfo, setStep } = useJourneyStore()

  const [isLoading, setIsLoading] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  // Rastrear abandono
  useAbandonmentTracker(journeyId, 'oferta', isCompleted)

  const handleAccept = async () => {
    setIsLoading(true)

    // Simular processamento
    await new Promise(resolve => setTimeout(resolve, 1000))

    setIsCompleted(true)
    setStep('knox')
    router.push('/credito/knox')
  }

  const handleReject = () => {
    // Poderia registrar evento de rejeição
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
          <JourneyProgress currentStep="oferta" completedSteps={['otp', 'device', 'renda']} />
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
