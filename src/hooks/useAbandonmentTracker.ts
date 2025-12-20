'use client'

import { useEffect, useRef } from 'react'

/**
 * Hook para rastrear abandono de jornada
 * Registra evento quando usuário fecha aba/navegador sem completar o step
 *
 * @param journeyId - ID da jornada (device_modelo)
 * @param stepName - Nome do step atual (ex: 'otp', 'device', 'renda')
 * @param isCompleted - Se o step foi completado (não registra abandono se true)
 */
export function useAbandonmentTracker(
  journeyId: number | null,
  stepName: string,
  isCompleted: boolean
) {
  const hasAbandoned = useRef(false)
  const isCompletedRef = useRef(isCompleted)

  // Manter ref atualizada para usar no event handler
  useEffect(() => {
    isCompletedRef.current = isCompleted
  }, [isCompleted])

  useEffect(() => {
    if (!journeyId) return

    const sendAbandonEvent = () => {
      // Só registra se não completou o step e ainda não abandonou
      if (!isCompletedRef.current && !hasAbandoned.current) {
        hasAbandoned.current = true
        console.log('🚪 Abandono detectado no step:', stepName)

        // Beacon API garante envio mesmo durante fechamento
        // É fire-and-forget, não bloqueia o fechamento da página
        navigator.sendBeacon(
          '/api/journey/abandon',
          JSON.stringify({
            journeyId,
            stepName,
            timestamp: new Date().toISOString()
          })
        )
      }
    }

    // visibilitychange - MAIS CONFIÁVEL em mobile (iOS/Android)
    // Dispara quando usuário troca de aba, minimiza app, fecha navegador
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendAbandonEvent()
      }
    }

    // beforeunload - funciona em desktop
    const handleBeforeUnload = () => {
      sendAbandonEvent()
    }

    // Registrar todos os eventos para máxima compatibilidade
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
    }
  }, [journeyId, stepName])
}
