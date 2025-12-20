'use client'

import Image from 'next/image'

interface CashlyLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { width: 100, height: 32 },
  md: { width: 140, height: 45 },
  lg: { width: 180, height: 58 },
}

export function CashlyLogo({ className = '', size = 'md' }: CashlyLogoProps) {
  const { width, height } = sizes[size]

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Image
        src="/logo_cashly.png"
        alt="Cashly"
        width={width}
        height={height}
        priority
        className="object-contain"
      />
    </div>
  )
}
