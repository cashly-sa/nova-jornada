'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  PalencaEvent,
  PalencaSuccessData,
  PalencaError,
  buildPalencaUrl,
  PALENCA_CONFIG,
} from '@/types/palenca.types'

interface PalencaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (data: PalencaSuccessData) => void
  onError: (error: PalencaError) => void
  platform: 'uber' | '99'
  journeyId: number
}

export function PalencaModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  platform,
  journeyId,
}: PalencaModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [iframeError, setIframeError] = useState(false)

  // Construir URL da Palenca
  const palencaUrl = buildPalencaUrl(platform, journeyId)

  // Handler para mensagens do iframe (memoizado para evitar re-binds)
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Verificar origem para segurança
      if (event.origin !== PALENCA_CONFIG.origin) {
        return
      }

      const data = event.data as PalencaEvent

      console.log('[Palenca] Evento recebido:', data)

      // Sucesso na conexao
      if (data.event === 'connection_success' && data.success) {
        onSuccess({
          userId: data.data?.user_id,
          platform: data.data?.platform,
          accountId: data.data?.account_id,
        })
        return
      }

      // Erro na conexao
      if (data.event === 'connection_error' || data.success === false) {
        onError({
          code: data.error?.code || 'unknown',
          message: data.error?.message || 'Erro desconhecido',
        })
        return
      }

      // Usuario criado (apenas log)
      if (data.event === 'user_created') {
        console.log('[Palenca] Usuario criado:', data.data?.user_id)
      }
    },
    [onSuccess, onError]
  )

  // Escutar eventos da Palenca via postMessage
  useEffect(() => {
    if (!isOpen) return

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isOpen, handleMessage])

  // Handler para quando iframe carrega
  const handleIframeLoad = () => {
    setIsLoading(false)
    console.log('[Palenca] iframe carregado')
  }

  // Handler para erro no iframe
  const handleIframeError = () => {
    console.warn('[Palenca] Erro ao carregar iframe, usando fallback')
    setIframeError(true)
    setIsLoading(false)
  }

  // Abrir em nova aba como fallback
  const openInNewTab = () => {
    window.open(palencaUrl, '_blank')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Botao fechar flutuante */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[60] p-2 bg-white/90 backdrop-blur-sm hover:bg-gray-100 rounded-full shadow-lg transition-colors"
        aria-label="Fechar"
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Loading indicator */}
      {isLoading && !iframeError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="animate-spin w-10 h-10 text-primary"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-text-secondary">Carregando...</p>
          </div>
        </div>
      )}

      {/* Erro - fallback para nova aba */}
      {iframeError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-warning"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Verificacao externa necessaria
            </h3>
            <p className="text-text-secondary mb-6">
              Para continuar, voce sera redirecionado para uma pagina segura de
              verificacao.
            </p>
            <button onClick={openInNewTab} className="btn-primary w-full">
              Continuar verificacao
            </button>
          </div>
        </div>
      )}

      {/* iframe Palenca - 100% da tela */}
      {!iframeError && (
        <iframe
          ref={iframeRef}
          src={palencaUrl}
          className={`w-full h-full border-none ${
            isLoading ? 'invisible' : 'visible'
          }`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none'
          }}
          allow="camera; microphone"
          title="Palenca Widget"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}
    </div>
  )
}
