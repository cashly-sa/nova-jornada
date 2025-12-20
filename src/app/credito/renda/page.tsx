'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileOnly } from '@/components/MobileOnly'
import { CashlyLogo } from '@/components/CashlyLogo'
import { JourneyProgress } from '@/components/JourneyProgress'
import { useJourneyStore } from '@/store/journey.store'
import { SessionGuard } from '@/components/SessionGuard'
import { useAbandonmentTracker } from '@/hooks/useAbandonmentTracker'

// Logo Uber (SVG inline)
function UberLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
      <text x="8" y="15" fontSize="8" fontWeight="bold" fontFamily="Arial">U</text>
    </svg>
  )
}

// Logo 99 (SVG inline)
function Logo99({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor">
      <circle cx="50" cy="50" r="48" fill="#FFCC00"/>
      <text x="50" y="62" textAnchor="middle" fontSize="40" fontWeight="bold" fontFamily="Arial" fill="#000">99</text>
    </svg>
  )
}

export default function RendaPage() {
  return (
    <SessionGuard requiredStep="renda">
      <RendaPageContent />
    </SessionGuard>
  )
}

function RendaPageContent() {
  const router = useRouter()
  const { journeyId, deviceInfo, setRendaInfo, setStep } = useJourneyStore()

  const [plataforma, setPlataforma] = useState<'uber' | '99' | ''>('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'form' | 'processing' | 'done'>('form')
  const [isCompleted, setIsCompleted] = useState(false)

  // Rastrear abandono
  useAbandonmentTracker(journeyId, 'renda', isCompleted)

  const handleSelect = async (selected: 'uber' | '99') => {
    setPlataforma(selected)
    setIsLoading(true)
    setStatus('processing')

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

    // Ir para oferta após breve delay
    setTimeout(() => {
      setIsCompleted(true)
      setStep('oferta')
      router.push('/credito/oferta')
    }, 1500)

    setIsLoading(false)
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
          <JourneyProgress currentStep="renda" completedSteps={['otp', 'device']} />
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
                    <svg viewBox="0 0 24 24" className="w-16 h-16" fill={plataforma === 'uber' ? 'white' : 'black'}>
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.66-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.98-1.73 6.64-2.87 7.97-3.43 3.8-1.57 4.59-1.84 5.1-1.85.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .37z"/>
                    </svg>
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
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${plataforma === '99' ? 'bg-black' : 'bg-[#FFCC00]'}`}>
                      <span className={`text-2xl font-black ${plataforma === '99' ? 'text-[#FFCC00]' : 'text-black'}`}>
                        99
                      </span>
                    </div>
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
        </div>
      </main>
    </MobileOnly>
  )
}
