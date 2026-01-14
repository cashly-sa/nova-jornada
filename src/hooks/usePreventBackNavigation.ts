'use client'

import { useEffect } from 'react'

/**
 * Hook para prevenir navegação com o botão voltar do navegador/Android.
 *
 * Funciona adicionando uma entrada no histórico e interceptando o evento popstate.
 * Quando o usuário aperta voltar, o hook re-adiciona a entrada, mantendo-o na página atual.
 */
export function usePreventBackNavigation() {
  useEffect(() => {
    // Adicionar entrada no histórico para "absorver" o back
    window.history.pushState(null, '', window.location.href)

    const handlePopState = () => {
      // Quando voltar é pressionado, re-adiciona entrada no histórico
      window.history.pushState(null, '', window.location.href)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
}
