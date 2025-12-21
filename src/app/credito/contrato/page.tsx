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

export default function ContratoPage() {
  return (
    <SessionGuard requiredStep="06">
      <ContratoPageContent />
    </SessionGuard>
  )
}

function ContratoPageContent() {
  const router = useRouter()
  const { journeyId, valorAprovado, deviceInfo, knoxImei, leadData, setContratoId, setStep } = useJourneyStore()

  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const termsRef = useRef<HTMLDivElement>(null)

  // Hooks de tracking
  const { logEvent, trackClick, trackCheckbox, trackStepCompleted } = useEventTracker('06')
  useVisibilityTracker('06')
  useAbandonmentTracker(journeyId, '06', isCompleted)
  useHeartbeat()

  // Logar visualização do contrato
  useEffect(() => {
    logEvent('contrato_viewed', { valor_aprovado: valorAprovado })
  }, [logEvent, valorAprovado])

  // Detectar scroll no contrato
  useEffect(() => {
    const termsEl = termsRef.current
    if (!termsEl) return

    const handleScroll = () => {
      if (!hasScrolled) {
        setHasScrolled(true)
        logEvent('contrato_scrolled')
      }
    }

    termsEl.addEventListener('scroll', handleScroll)
    return () => termsEl.removeEventListener('scroll', handleScroll)
  }, [hasScrolled, logEvent])

  const handleTermsChange = (checked: boolean) => {
    setAcceptedTerms(checked)
    trackCheckbox('accept_terms', checked)
    if (checked) {
      logEvent('contrato_terms_accepted')
    }
  }

  const handleSign = async () => {
    if (!acceptedTerms) return

    trackClick('sign_contract', 'Assinar contrato')
    setIsLoading(true)

    // Simular geração e assinatura do contrato
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Gerar ID do contrato (em produção seria da API)
    const contratoId = `CTR-${Date.now()}`
    setContratoId(contratoId)

    // Logar assinatura
    logEvent('contrato_signed', { contrato_id: contratoId })
    trackStepCompleted()

    // Atualizar step no banco
    try {
      await fetch('/api/journey/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId,
          step: '07',
          eventType: 'contrato_signed'
        })
      })
    } catch (err) {
      console.error('Erro ao atualizar step:', err)
    }

    setIsCompleted(true)
    setStep('07')
    router.push('/credito/sucesso')

    setIsLoading(false)
  }

  const taxaMensal = 3.99
  const parcelas = 12
  const valorParcela = valorAprovado
    ? Math.ceil((valorAprovado * (1 + (taxaMensal / 100) * parcelas)) / parcelas)
    : 0
  const valorTotal = valorParcela * parcelas

  return (
    <MobileOnly>
      <main className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="pt-6 pb-2">
          <CashlyLogo size="sm" />
        </div>

        {/* Progress */}
        <div className="px-4">
          <JourneyProgress currentStep="06" completedSteps={['01', '02', '03', '04', '05']} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 container-mobile pb-6">
          <div className="card animate-slide-up">
            <h1 className="page-title">Contrato de Crédito</h1>
            <p className="page-subtitle">
              Revise os detalhes e assine para finalizar
            </p>

            {/* Resumo do contrato */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">Valor do crédito</span>
                <span className="font-bold text-primary">{formatCurrency(valorAprovado || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Parcelas</span>
                <span className="font-medium">{parcelas}x de {formatCurrency(valorParcela)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Taxa mensal</span>
                <span className="font-medium">{taxaMensal}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Valor total</span>
                <span className="font-medium">{formatCurrency(valorTotal)}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between">
                <span className="text-text-secondary">Garantia</span>
                <span className="font-medium text-sm">{deviceInfo?.modelo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">IMEI</span>
                <span className="font-medium text-xs">{knoxImei}</span>
              </div>
            </div>

            {/* Termos */}
            <div
              ref={termsRef}
              className="bg-white border border-gray-200 rounded-xl p-4 mb-4 h-40 overflow-y-auto text-xs text-text-secondary"
            >
              <h3 className="font-bold text-text-primary mb-2">TERMOS E CONDIÇÕES</h3>
              <p className="mb-2">
                Este contrato estabelece os termos e condições do empréstimo pessoal
                oferecido pela Cashly Serviços Financeiros.
              </p>
              <p className="mb-2">
                <strong>1. DO OBJETO:</strong> O presente contrato tem por objeto a concessão
                de crédito pessoal, tendo como garantia o dispositivo móvel registrado
                no sistema Samsung Knox Guard.
              </p>
              <p className="mb-2">
                <strong>2. DO VALOR E PAGAMENTO:</strong> O valor do empréstimo será de {formatCurrency(valorAprovado || 0)},
                a ser pago em {parcelas} parcelas mensais de {formatCurrency(valorParcela)}.
              </p>
              <p className="mb-2">
                <strong>3. DA GARANTIA:</strong> O dispositivo móvel identificado pelo IMEI {knoxImei}
                servirá como garantia do presente contrato. Em caso de inadimplência, o dispositivo
                poderá ser bloqueado remotamente através do sistema Knox Guard.
              </p>
              <p className="mb-2">
                <strong>4. DA INADIMPLÊNCIA:</strong> Em caso de atraso no pagamento superior a 30 dias,
                o dispositivo será bloqueado até a regularização do débito.
              </p>
              <p>
                <strong>5. DO FORO:</strong> Fica eleito o foro da Comarca de São Paulo para dirimir
                quaisquer questões oriundas do presente contrato.
              </p>
            </div>

            {/* Checkbox aceite */}
            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => handleTermsChange(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-text-secondary">
                Li e aceito os termos e condições do contrato de crédito pessoal
              </span>
            </label>

            {/* Botão assinar */}
            <button
              onClick={handleSign}
              disabled={!acceptedTerms || isLoading}
              className="btn-primary"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Assinando contrato...
                </span>
              ) : (
                'Assinar contrato'
              )}
            </button>
          </div>
        </div>
      </main>
    </MobileOnly>
  )
}
