'use client'

import { useEffect, useState, type ReactNode } from 'react'

interface MobileOnlyProps {
  children: ReactNode
}

export function MobileOnly({ children }: MobileOnlyProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const checkMobile = () => {
      // Verifica viewport e user agent
      const isMobileViewport = window.innerWidth <= 768
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )

      // Considera mobile se qualquer condição for verdadeira
      setIsMobile(isMobileViewport || isMobileUA)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Loading state - suppressHydrationWarning evita erros de hidratação
  if (isMobile === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" suppressHydrationWarning>
        <div className="animate-pulse text-text-secondary">Carregando...</div>
      </div>
    )
  }

  // Desktop - mostrar mensagem
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="card max-w-md text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">
            Acesse pelo celular
          </h1>
          <p className="text-text-secondary">
            Esta jornada foi otimizada para dispositivos móveis.
            Por favor, acesse pelo seu celular para continuar.
          </p>
        </div>
      </div>
    )
  }

  // Mobile - renderizar conteúdo
  return <>{children}</>
}
