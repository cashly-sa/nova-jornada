'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileOnly } from '@/components/MobileOnly'
import { CashlyLogo } from '@/components/CashlyLogo'
import { JourneyProgress } from '@/components/JourneyProgress'
import { useJourneyStore } from '@/store/journey.store'
import { validateIMEI, formatIMEI } from '@/utils/validators'
import { SessionGuard } from '@/components/SessionGuard'

const steps = [
  {
    title: 'Baixe o Knox Guard',
    description: 'Acesse a Google Play Store e baixe o app Samsung Knox Guard',
    icon: '📱',
  },
  {
    title: 'Registre seu dispositivo',
    description: 'Abra o app e siga as instruções para registrar seu celular',
    icon: '📝',
  },
  {
    title: 'Aceite os termos',
    description: 'Leia e aceite os termos de uso do Knox Guard',
    icon: '✅',
  },
  {
    title: 'Copie o IMEI',
    description: 'O IMEI aparecerá na tela após o registro. Copie e cole abaixo',
    icon: '📋',
  },
]

export default function KnoxPage() {
  return (
    <SessionGuard requiredStep="knox">
      <KnoxPageContent />
    </SessionGuard>
  )
}

function KnoxPageContent() {
  const router = useRouter()
  const { journeyId, valorAprovado, setKnoxImei, setStep } = useJourneyStore()

  const [imei, setImei] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleImeiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatIMEI(e.target.value)
    setImei(formatted)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateIMEI(imei)) {
      setError('IMEI inválido. Deve ter 15 dígitos.')
      return
    }

    setIsLoading(true)

    // Simular validação (em produção, seria API do Knox)
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Salvar IMEI
    setKnoxImei(imei)
    setStep('contrato')
    router.push('/credito/contrato')

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
          <JourneyProgress currentStep="knox" completedSteps={['otp', 'device', 'renda', 'oferta']} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 container-mobile pb-6">
          <div className="card animate-slide-up">
            <h1 className="page-title">Registro Knox Guard</h1>
            <p className="page-subtitle">
              Siga os passos abaixo para registrar seu celular como garantia
            </p>

            {/* Steps */}
            <div className="space-y-4 mb-6">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="flex gap-4 p-3 rounded-xl bg-gray-50"
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl shadow-soft flex-shrink-0">
                    {step.icon}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">
                      {index + 1}. {step.title}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Link para Play Store */}
            <a
              href="https://play.google.com/store/apps/details?id=com.samsung.android.knox.kpu"
              target="_blank"
              rel="noopener noreferrer"
              className="block mb-6"
            >
              <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors">
                <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                </svg>
                <div>
                  <p className="font-medium text-primary">Abrir Google Play</p>
                  <p className="text-xs text-text-secondary">Baixar Knox Guard</p>
                </div>
                <svg className="w-5 h-5 text-primary ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </a>

            {/* Form IMEI */}
            <form onSubmit={handleSubmit}>
              <label className="label">IMEI do dispositivo</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Digite o IMEI (15 dígitos)"
                value={imei}
                onChange={handleImeiChange}
                className={`input-field ${error ? 'border-error' : ''}`}
                maxLength={15}
              />
              {error && <p className="error-message">{error}</p>}

              <p className="text-xs text-text-secondary mt-2 mb-4">
                O IMEI será exibido no app Knox Guard após o registro
              </p>

              <button
                type="submit"
                disabled={imei.length < 15 || isLoading}
                className="btn-primary"
              >
                {isLoading ? 'Verificando...' : 'Confirmar IMEI'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </MobileOnly>
  )
}
