// Detecção de dispositivo usando Client Hints API e User-Agent

export interface DeviceInfo {
  modelo: string
  fabricante: string
  userAgent: string
}

// Declaração de tipos para Client Hints API
interface NavigatorUAData {
  getHighEntropyValues(hints: string[]): Promise<{
    model?: string
    platform?: string
    platformVersion?: string
  }>
}

declare global {
  interface Navigator {
    userAgentData?: NavigatorUAData
  }
}

export async function detectDevice(): Promise<DeviceInfo> {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''

  // Tentar Client Hints API primeiro (mais preciso)
  if (typeof navigator !== 'undefined' && navigator.userAgentData) {
    try {
      const hints = await navigator.userAgentData.getHighEntropyValues([
        'model',
        'platform',
        'platformVersion'
      ])

      if (hints.model) {
        return {
          modelo: hints.model,
          fabricante: hints.platform || 'unknown',
          userAgent
        }
      }
    } catch (err) {
      console.warn('Client Hints API not available:', err)
    }
  }

  // Fallback: Parse User-Agent
  return parseUserAgent(userAgent)
}

function parseUserAgent(ua: string): DeviceInfo {
  // Samsung
  const samsungMatch = ua.match(/SM-[A-Z0-9]+/i)
  if (samsungMatch) {
    return {
      modelo: samsungMatch[0],
      fabricante: 'samsung',
      userAgent: ua
    }
  }

  // Xiaomi/Redmi/Poco
  const xiaomiPatterns = [
    /\d{4,}[A-Z0-9]+/i,  // Ex: 23117RA68G
    /Redmi\s+[A-Za-z0-9\s]+/i,
    /POCO\s+[A-Za-z0-9\s]+/i,
  ]

  for (const pattern of xiaomiPatterns) {
    const match = ua.match(pattern)
    if (match) {
      return {
        modelo: match[0].trim(),
        fabricante: 'Xiaomi',
        userAgent: ua
      }
    }
  }

  // Motorola
  const motoMatch = ua.match(/moto\s*[a-z0-9\(\)\s]+/i)
  if (motoMatch) {
    return {
      modelo: motoMatch[0].trim(),
      fabricante: 'motorola',
      userAgent: ua
    }
  }

  const edgeMatch = ua.match(/motorola\s+edge\s*[a-z0-9\s]+/i)
  if (edgeMatch) {
    return {
      modelo: edgeMatch[0].trim(),
      fabricante: 'motorola',
      userAgent: ua
    }
  }

  // Realme
  const realmeMatch = ua.match(/RMX\d+/i)
  if (realmeMatch) {
    return {
      modelo: realmeMatch[0],
      fabricante: 'realme',
      userAgent: ua
    }
  }

  // OPPO
  const oppoMatch = ua.match(/CPH\d+/i)
  if (oppoMatch) {
    return {
      modelo: oppoMatch[0],
      fabricante: 'OPPO',
      userAgent: ua
    }
  }

  // Infinix
  const infinixMatch = ua.match(/Infinix\s*X\d+/i)
  if (infinixMatch) {
    return {
      modelo: infinixMatch[0],
      fabricante: 'INFINIX',
      userAgent: ua
    }
  }

  // iPhone - iOS não reporta modelo específico no User-Agent
  if (ua.includes('iPhone')) {
    return {
      modelo: 'iPhone',
      fabricante: 'Apple',
      userAgent: ua
    }
  }

  // iPad
  if (ua.includes('iPad')) {
    return {
      modelo: 'iPad',
      fabricante: 'Apple',
      userAgent: ua
    }
  }

  // Não identificado
  return {
    modelo: 'unknown',
    fabricante: 'unknown',
    userAgent: ua
  }
}

// Hook para usar no React
export function useDeviceDetection() {
  return {
    detect: detectDevice
  }
}
