'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MobileOnly } from '@/components/MobileOnly'
import { CashlyLogo } from '@/components/CashlyLogo'
import { useJourneyStore } from '@/store/journey.store'
import { formatCurrency } from '@/utils/validators'
import { SessionGuard } from '@/components/SessionGuard'
import { useEventTracker } from '@/hooks/useEventTracker'
import { useVisibilityTracker } from '@/hooks/useVisibilityTracker'

export default function SucessoPage() {
  return (
    <SessionGuard requiredStep="07">
      <SucessoPageContent />
    </SessionGuard>
  )
}

function SucessoPageContent() {
  const router = useRouter()
  const { valorAprovado, contratoId, leadData, reset } = useJourneyStore()

  // Hooks de tracking
  const { logEvent, trackClick, trackLinkClick } = useEventTracker('07')
  useVisibilityTracker('07')

  // Logar conclusão da jornada
  useEffect(() => {
    logEvent('journey_completed', {
      valor_aprovado: valorAprovado,
      contrato_id: contratoId
    })
  }, [logEvent, valorAprovado, contratoId])

  const handleNewJourney = () => {
    trackClick('new_journey', 'Voltar ao início')
    reset()
    router.push('/')
  }

  const handleDownloadApp = () => {
    trackLinkClick('app_download')
    logEvent('app_download_clicked')
  }

  return (
    <MobileOnly>
      <main className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="pt-6 pb-2">
          <CashlyLogo size="sm" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 container-mobile flex flex-col justify-center">
          <div className="card animate-slide-up text-center">
            {/* Ícone de sucesso */}
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                <svg className="w-12 h-12 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {/* Confetti effect */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full animate-ping"
                    style={{
                      backgroundColor: ['#00C853', '#2962FF', '#FFB300', '#FF5252'][i % 4],
                      left: `${50 + Math.cos(i * 30 * Math.PI / 180) * 60}%`,
                      top: `${50 + Math.sin(i * 30 * Math.PI / 180) * 60}%`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '1s',
                    }}
                  />
                ))}
              </div>
            </div>

            <h1 className="text-2xl font-bold text-success mb-2">
              Parabéns!
            </h1>
            <p className="text-lg text-text-primary mb-6">
              Seu crédito foi aprovado!
            </p>

            {/* Valor */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6 mb-6">
              <p className="text-sm text-text-secondary mb-1">Valor liberado</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-primary to-[#1DE9B6] bg-clip-text text-transparent">
                {formatCurrency(valorAprovado || 0)}
              </p>
            </div>

            {/* Informações */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Contrato</span>
                <span className="font-mono text-xs">{contratoId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Status</span>
                <span className="text-success font-medium">Aprovado</span>
              </div>
            </div>

            {/* Próximos passos */}
            <div className="bg-primary/5 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-medium text-text-primary mb-2">Próximos passos:</h3>
              <ul className="text-sm text-text-secondary space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">1.</span>
                  <span>O valor será depositado em até 24h úteis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">2.</span>
                  <span>Você receberá um SMS com os dados do depósito</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">3.</span>
                  <span>Mantenha o Knox Guard instalado durante o contrato</span>
                </li>
              </ul>
            </div>

            {/* Download app */}
            <a
              href="#"
              onClick={handleDownloadApp}
              className="block mb-4"
            >
              <div className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-primary/30 transition-colors">
                <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-text-secondary">Baixar app Cashly (opcional)</span>
              </div>
            </a>

            <button
              onClick={handleNewJourney}
              className="w-full py-3 text-text-secondary hover:text-primary transition-colors"
            >
              Voltar ao início
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="py-4 text-center">
          <p className="text-xs text-text-secondary">
            Dúvidas? Entre em contato pelo WhatsApp
          </p>
        </div>
      </main>
    </MobileOnly>
  )
}
