// Detecção de dispositivo usando Client Hints API e User-Agent

export interface DeviceInfo {
  modelo: string
  fabricante: string
  userAgent: string
  detection_source: '51degrees' | 'client_hints_high' | 'client_hints_low' | 'user_agent'
  detection_confidence: number // 0-100
}

// Declaração de tipos para Client Hints API
interface NavigatorUABrand {
  brand: string
  version: string
}

interface NavigatorUAData {
  // Low Entropy (sempre disponíveis)
  brands: NavigatorUABrand[]
  mobile: boolean
  platform: string
  // High Entropy (requer chamada assíncrona)
  getHighEntropyValues(hints: string[]): Promise<{
    model?: string
    platform?: string
    platformVersion?: string
    architecture?: string
    uaFullVersion?: string
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
          userAgent,
          detection_source: 'client_hints_high',
          detection_confidence: 75
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
  // ========== APPLE (verificar PRIMEIRO para evitar falsos positivos) ==========

  // iPhone
  if (ua.includes('iPhone')) {
    return {
      modelo: 'iPhone',
      fabricante: 'Apple',
      userAgent: ua,
      detection_source: 'user_agent',
      detection_confidence: 60 // Apple não revela modelo específico
    }
  }

  // iPad
  if (ua.includes('iPad')) {
    return {
      modelo: 'iPad',
      fabricante: 'Apple',
      userAgent: ua,
      detection_source: 'user_agent',
      detection_confidence: 60
    }
  }

  // Mac (para evitar falsos positivos em desktop)
  if (ua.includes('Macintosh')) {
    return {
      modelo: 'Mac',
      fabricante: 'Apple',
      userAgent: ua,
      detection_source: 'user_agent',
      detection_confidence: 60
    }
  }

  // ========== ANDROID ==========

  // Samsung - padrão SM-XXXXX
  const samsungMatch = ua.match(/SM-[A-Z]\d{3,4}[A-Z]?/i)
  if (samsungMatch) {
    return {
      modelo: samsungMatch[0].toUpperCase(),
      fabricante: 'Samsung',
      userAgent: ua,
      detection_source: 'user_agent',
      detection_confidence: 80 // Modelo específico extraído
    }
  }

  // Motorola
  const motoMatch = ua.match(/moto\s*[a-z0-9\(\)\s]+/i)
  if (motoMatch) {
    return {
      modelo: motoMatch[0].trim(),
      fabricante: 'Motorola',
      userAgent: ua,
      detection_source: 'user_agent',
      detection_confidence: 70
    }
  }

  const edgeMatch = ua.match(/motorola\s+edge\s*[a-z0-9\s]+/i)
  if (edgeMatch) {
    return {
      modelo: edgeMatch[0].trim(),
      fabricante: 'Motorola',
      userAgent: ua,
      detection_source: 'user_agent',
      detection_confidence: 70
    }
  }

  // Realme - padrão RMX seguido de números
  const realmeMatch = ua.match(/RMX\d{4}/i)
  if (realmeMatch) {
    return {
      modelo: realmeMatch[0].toUpperCase(),
      fabricante: 'Realme',
      userAgent: ua,
      detection_source: 'user_agent',
      detection_confidence: 75
    }
  }

  // OPPO - padrão CPH seguido de números
  const oppoMatch = ua.match(/CPH\d{4}/i)
  if (oppoMatch) {
    return {
      modelo: oppoMatch[0].toUpperCase(),
      fabricante: 'OPPO',
      userAgent: ua,
      detection_source: 'user_agent',
      detection_confidence: 75
    }
  }

  // Infinix - padrão Infinix X seguido de números
  const infinixMatch = ua.match(/Infinix\s*X\d{3,4}/i)
  if (infinixMatch) {
    return {
      modelo: infinixMatch[0],
      fabricante: 'Infinix',
      userAgent: ua,
      detection_source: 'user_agent',
      detection_confidence: 70
    }
  }

  // Xiaomi/Redmi/Poco - verificar por último (padrões mais genéricos)
  // Redmi explícito
  const redmiMatch = ua.match(/Redmi\s+[A-Za-z0-9]+(\s+[A-Za-z0-9]+)?/i)
  if (redmiMatch) {
    return {
      modelo: redmiMatch[0].trim(),
      fabricante: 'Xiaomi',
      userAgent: ua,
      detection_source: 'user_agent',
      detection_confidence: 70
    }
  }

  // POCO explícito
  const pocoMatch = ua.match(/POCO\s+[A-Za-z0-9]+/i)
  if (pocoMatch) {
    return {
      modelo: pocoMatch[0].trim(),
      fabricante: 'Xiaomi',
      userAgent: ua,
      detection_source: 'user_agent',
      detection_confidence: 70
    }
  }

  // Xiaomi modelo numérico (ex: 23117RA68G) - mais restritivo
  // Deve começar com 2 dígitos do ano (20, 21, 22, 23, 24, 25) + mais dígitos + letras
  const xiaomiNumericMatch = ua.match(/\b(2[0-5]\d{3,4}[A-Z]{2,}[A-Z0-9]*)\b/i)
  if (xiaomiNumericMatch) {
    return {
      modelo: xiaomiNumericMatch[1].toUpperCase(),
      fabricante: 'Xiaomi',
      userAgent: ua,
      detection_source: 'user_agent',
      detection_confidence: 65
    }
  }

  // ========== NÃO IDENTIFICADO ==========
  return {
    modelo: 'unknown',
    fabricante: 'unknown',
    userAgent: ua,
    detection_source: 'user_agent',
    detection_confidence: 0 // Não conseguiu identificar
  }
}

// Detecção usando 51Degrees API (server-side)
export async function detectDeviceWith51Degrees(): Promise<DeviceInfo> {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''

  try {
    const response = await fetch('/api/device/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.success && data.device) {
      return {
        modelo: data.device.modelo !== 'unknown' ? data.device.modelo : 'unknown',
        fabricante: data.device.fabricante !== 'unknown' ? data.device.fabricante : 'unknown',
        userAgent,
        detection_source: data.detection_source || '51degrees',
        detection_confidence: data.detection_confidence || 95,
      }
    }

    throw new Error('Invalid response from 51Degrees')
  } catch (error) {
    console.warn('51Degrees falhou, usando fallback local:', error)
    // Fallback para detecção local
    return detectDevice()
  }
}

// Hook para usar no React
export function useDeviceDetection() {
  return {
    detect: detectDevice,
    detectWith51Degrees: detectDeviceWith51Degrees
  }
}
