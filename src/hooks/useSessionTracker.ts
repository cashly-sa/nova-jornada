'use client'

import { useEffect, useRef } from 'react'
import { useJourneyStore } from '@/store/journey.store'

const STORAGE_KEY_LAST_VISIT = 'cashly_last_visit'
const STORAGE_KEY_LAST_STEP = 'cashly_last_step'
const MIN_AWAY_SECONDS = 60 // Tempo mínimo fora para considerar como retorno

/**
 * Hook para detectar retorno de sessão
 * Dispara evento session_resumed quando usuário volta após abandono
 */
export function useSessionTracker() {
  const { journeyId, currentStep } = useJourneyStore()
  const hasChecked = useRef(false)

  useEffect(() => {
    if (!journeyId || hasChecked.current) return
    hasChecked.current = true

    const lastVisitStr = localStorage.getItem(STORAGE_KEY_LAST_VISIT)
    const lastStep = localStorage.getItem(STORAGE_KEY_LAST_STEP)

    if (lastVisitStr) {
      const lastVisit = parseInt(lastVisitStr, 10)
      const timeAway = Math.round((Date.now() - lastVisit) / 1000)

      // Se ficou mais de 60 segundos fora, é um retorno
      if (timeAway > MIN_AWAY_SECONDS) {
        navigator.sendBeacon(
          '/api/journey/event',
          JSON.stringify({
            journeyId,
            eventType: 'session_resumed',
            stepName: 'session',
            metadata: {
              time_away_seconds: timeAway,
              previous_step: lastStep,
              timestamp: new Date().toISOString(),
            }
          })
        )
      }
    }

    // Atualizar timestamp da última visita
    localStorage.setItem(STORAGE_KEY_LAST_VISIT, Date.now().toString())
  }, [journeyId])

  // Atualizar step atual sempre que mudar
  useEffect(() => {
    if (currentStep) {
      localStorage.setItem(STORAGE_KEY_LAST_STEP, currentStep)
      localStorage.setItem(STORAGE_KEY_LAST_VISIT, Date.now().toString())
    }
  }, [currentStep])
}
