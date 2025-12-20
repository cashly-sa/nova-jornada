'use client'

import { useEffect, useRef } from 'react'
import { useJourneyStore } from '@/store/journey.store'

/**
 * Hook para rastrear eventos de visibilidade (background/foreground)
 * Especialmente importante para Android onde visibilitychange é confiável
 */
export function useVisibilityTracker(stepName: string) {
  const { journeyId } = useJourneyStore()
  const hiddenAt = useRef<number | null>(null)
  const visibleSince = useRef<number>(Date.now())

  useEffect(() => {
    if (!journeyId) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // App foi para background
        const durationVisible = Math.round((Date.now() - visibleSince.current) / 1000)
        hiddenAt.current = Date.now()

        navigator.sendBeacon(
          '/api/journey/event',
          JSON.stringify({
            journeyId,
            eventType: 'app_backgrounded',
            stepName,
            metadata: {
              duration_visible: durationVisible,
              timestamp: new Date().toISOString(),
            }
          })
        )
      } else {
        // App voltou para foreground
        const durationHidden = hiddenAt.current
          ? Math.round((Date.now() - hiddenAt.current) / 1000)
          : 0

        navigator.sendBeacon(
          '/api/journey/event',
          JSON.stringify({
            journeyId,
            eventType: 'app_foregrounded',
            stepName,
            metadata: {
              duration_hidden: durationHidden,
              timestamp: new Date().toISOString(),
            }
          })
        )

        // Reset timers
        hiddenAt.current = null
        visibleSince.current = Date.now()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [journeyId, stepName])
}
