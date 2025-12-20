'use client'

import { JOURNEY_STEPS, type JourneyStep, getStepIndex } from '@/types/journey.types'

interface JourneyProgressProps {
  currentStep: JourneyStep
  completedSteps?: JourneyStep[]
}

export function JourneyProgress({ currentStep, completedSteps = [] }: JourneyProgressProps) {
  const currentIndex = getStepIndex(currentStep)

  // Não mostrar progresso na etapa CPF (entrada)
  if (currentStep === 'cpf' || currentStep === 'cadastro') {
    return null
  }

  // Filtrar apenas os steps relevantes para o fluxo de crédito
  const creditSteps = JOURNEY_STEPS.filter(s => !['cpf', 'cadastro'].includes(s.key))
  const adjustedCurrentIndex = creditSteps.findIndex(s => s.key === currentStep)

  return (
    <div className="w-full mb-6 animate-fade-in">
      {/* Steps com ícones */}
      <div className="flex justify-between mb-2 px-2">
        {creditSteps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.key) || index < adjustedCurrentIndex
          const isCurrent = step.key === currentStep
          const isPending = !isCompleted && !isCurrent

          return (
            <div
              key={step.key}
              className="flex flex-col items-center"
              style={{ flex: 1 }}
            >
              {/* Círculo do step */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  transition-all duration-300
                  ${isCompleted ? 'bg-success text-white' : ''}
                  ${isCurrent ? 'bg-primary-gradient text-white animate-pulse-slow shadow-medium' : ''}
                  ${isPending ? 'bg-gray-200 text-text-secondary' : ''}
                `}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>

              {/* Label (apenas em telas maiores) */}
              <span
                className={`
                  text-xs mt-1 hidden sm:block
                  ${isCompleted ? 'text-success font-medium' : ''}
                  ${isCurrent ? 'text-primary font-medium' : ''}
                  ${isPending ? 'text-text-secondary' : ''}
                `}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Barra de progresso */}
      <div className="progress-container mx-2">
        <div
          className="progress-fill"
          style={{
            width: `${Math.round((adjustedCurrentIndex / (creditSteps.length - 1)) * 100)}%`
          }}
        />
      </div>

      {/* Label do step atual */}
      <div className="text-center mt-2">
        <span className="text-sm text-text-secondary">
          Etapa {adjustedCurrentIndex + 1} de {creditSteps.length}:{' '}
          <span className="font-medium text-text-primary">
            {creditSteps[adjustedCurrentIndex]?.label}
          </span>
        </span>
      </div>
    </div>
  )
}
