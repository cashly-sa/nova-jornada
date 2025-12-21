'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useJourneyStore } from '@/store/journey.store'

/**
 * Hook para enviar heartbeat periódico
 * Permite tracking de usuários ativos em tempo real
 *
 * Usa sendBeacon para garantir envio mesmo em:
 * - Fechamento de aba/browser
 * - App indo para background (Android)
 */
export function useHeartbeat(intervalMs = 30000) {
  const { journeyId } = useJourneyStore()
  const lastBeatRef = useRef<number>(0)

  const sendHeartbeat = useCallback(() => {
    if (!journeyId) return

    const now = Date.now()
    // Debounce: não enviar se último foi há menos de 5s
    if (now - lastBeatRef.current < 5000) return
    lastBeatRef.current = now

    // Usar sendBeacon para garantir envio mesmo em background/fechamento
    navigator.sendBeacon(
      '/api/heartbeat',
      JSON.stringify({ journeyId })
    )
  }, [journeyId])

  useEffect(() => {
    if (!journeyId) return

    // Heartbeat inicial
    sendHeartbeat()

    // Heartbeat periódico
    const interval = setInterval(sendHeartbeat, intervalMs)

    // Enviar quando voltar do background
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    // Enviar antes de fechar (best effort)
    const onExit = () => {
      navigator.sendBeacon(
        '/api/heartbeat',
        JSON.stringify({ journeyId })
      )
    }
    window.addEventListener('beforeunload', onExit)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('beforeunload', onExit)
    }
  }, [journeyId, intervalMs, sendHeartbeat])
}
