'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useJourneyStore } from '@/store/journey.store'

/**
 * Hook para tracking de eventos do usuário
 * Usa Beacon API para garantir envio mesmo em fechamento de página
 */
export function useEventTracker(stepName: string) {
  const { journeyId } = useJourneyStore()
  const stepEnteredAt = useRef<number>(Date.now())
  const hasLoggedEnter = useRef(false)

  /**
   * Loga um evento de forma assíncrona (fire-and-forget)
   */
  const logEvent = useCallback((
    eventType: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!journeyId) return

    // Usar Beacon para garantir envio mesmo durante fechamento
    navigator.sendBeacon(
      '/api/journey/event',
      JSON.stringify({
        journeyId,
        eventType,
        stepName,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        }
      })
    )
  }, [journeyId, stepName])

  /**
   * Rastreia clique em botão
   */
  const trackClick = useCallback((buttonId: string, buttonText?: string) => {
    logEvent('button_clicked', {
      button_id: buttonId,
      button_text: buttonText
    })
  }, [logEvent])

  /**
   * Rastreia foco em input
   */
  const trackInputFocus = useCallback((fieldName: string) => {
    logEvent('input_focused', { field_name: fieldName })
  }, [logEvent])

  /**
   * Rastreia preenchimento de campo
   */
  const trackInputFilled = useCallback((fieldName: string, isValid: boolean) => {
    logEvent('input_filled', {
      field_name: fieldName,
      is_valid: isValid
    })
  }, [logEvent])

  /**
   * Rastreia erro de validação
   */
  const trackFormError = useCallback((fieldName: string, error: string) => {
    logEvent('form_error', {
      field_name: fieldName,
      error
    })
  }, [logEvent])

  /**
   * Rastreia clique em link externo
   */
  const trackLinkClick = useCallback((url: string) => {
    logEvent('link_clicked', { url })
  }, [logEvent])

  /**
   * Rastreia toggle de checkbox
   */
  const trackCheckbox = useCallback((checkboxId: string, checked: boolean) => {
    logEvent('checkbox_toggled', {
      checkbox_id: checkboxId,
      checked
    })
  }, [logEvent])

  /**
   * Marca step como completado (com duração)
   */
  const trackStepCompleted = useCallback(() => {
    const duration = Math.round((Date.now() - stepEnteredAt.current) / 1000)
    logEvent('step_completed', { duration_seconds: duration })
  }, [logEvent])

  // Log automático de entrada no step
  useEffect(() => {
    if (!journeyId || hasLoggedEnter.current) return
    hasLoggedEnter.current = true
    stepEnteredAt.current = Date.now()
    logEvent('step_entered')
  }, [journeyId, logEvent])

  return {
    logEvent,
    trackClick,
    trackInputFocus,
    trackInputFilled,
    trackFormError,
    trackLinkClick,
    trackCheckbox,
    trackStepCompleted,
  }
}
