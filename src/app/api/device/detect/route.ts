import { NextRequest, NextResponse } from 'next/server'

// Importação dinâmica do módulo 51Degrees
async function get51DegreesParser() {
  const module = await import('@51degrees/ua-parser-js')
  return module.default || module
}

// Interface para tipagem do resultado 51Degrees
interface FiftyOneDegreesResult {
  device?: {
    vendor?: string
    model?: string
    type?: string
    // Campos adicionais da nova configuração
    hardwarevendor?: string
    hardwaremodel?: string
    hardwarename?: string
    platformvendor?: string
    platformname?: string
    platformversion?: string
    browservendor?: string
    browsername?: string
    browserversion?: string
    devicetype?: string
    priceband?: string
    pricebandnullreason?: string
    setheaderbrowseracceptch?: string
    setheaderhardwareacceptch?: string
    setheaderplatformacceptch?: string
  }
  os?: {
    name?: string
    version?: string
  }
  browser?: {
    name?: string
    version?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const resourceKey = process.env.FIFTY_ONE_DEGREES_KEY

    if (!resourceKey) {
      console.error('51Degrees: FIFTY_ONE_DEGREES_KEY não configurada')
      return NextResponse.json(
        { error: '51Degrees key not configured' },
        { status: 500 }
      )
    }

    // Pegar User-Agent do request
    const userAgent = request.headers.get('user-agent') || ''

    // Pegar todos os headers do request (incluindo Client Hints)
    const headers: Record<string, string> = {
      'user-agent': userAgent,
    }

    // Adicionar Client Hints se disponíveis
    const clientHintHeaders = [
      'sec-ch-ua',
      'sec-ch-ua-mobile',
      'sec-ch-ua-platform',
      'sec-ch-ua-model',
      'sec-ch-ua-platform-version',
      'sec-ch-ua-full-version-list',
    ]

    clientHintHeaders.forEach(header => {
      const value = request.headers.get(header)
      if (value) {
        headers[header] = value
      }
    })

    // Chamar 51Degrees API
    const UAParser = await get51DegreesParser()
    const result: FiftyOneDegreesResult = await UAParser(resourceKey, headers)

    // Extrair dados do device (suporta ambos formatos de resposta)
    const device = result.device || {}

    // Hardware
    const hardwareVendor = device.hardwarevendor || device.vendor || 'unknown'
    const hardwareModel = device.hardwaremodel || device.model || 'unknown'
    const hardwareName = device.hardwarename || 'unknown'

    // Platform/OS
    const platformVendor = device.platformvendor || 'unknown'
    const platformName = device.platformname || result.os?.name || 'unknown'
    const platformVersion = device.platformversion || result.os?.version || 'unknown'

    // Browser
    const browserVendor = device.browservendor || 'unknown'
    const browserName = device.browsername || result.browser?.name || 'unknown'
    const browserVersion = device.browserversion || result.browser?.version || 'unknown'

    // Device Type & Price
    const deviceType = device.devicetype || device.type || 'unknown'
    const priceBand = device.priceband || 'unknown'
    const priceBandReason = device.pricebandnullreason || null

    // Accept-CH Headers (para Client Hints)
    const acceptCHBrowser = device.setheaderbrowseracceptch || null
    const acceptCHHardware = device.setheaderhardwareacceptch || null
    const acceptCHPlatform = device.setheaderplatformacceptch || null

    return NextResponse.json({
      success: true,
      // Dados principais (compatibilidade)
      device: {
        modelo: hardwareModel,
        fabricante: hardwareVendor,
        tipo: deviceType,
      },
      os: {
        nome: platformName,
        versao: platformVersion,
      },
      browser: {
        nome: browserName,
        versao: browserVersion,
      },
      // Dados completos da nova API
      fullData: {
        hardware: {
          vendor: hardwareVendor,
          model: hardwareModel,
          name: hardwareName,
        },
        platform: {
          vendor: platformVendor,
          name: platformName,
          version: platformVersion,
        },
        browser: {
          vendor: browserVendor,
          name: browserName,
          version: browserVersion,
        },
        deviceType,
        priceBand,
        priceBandReason,
        acceptCH: {
          browser: acceptCHBrowser,
          hardware: acceptCHHardware,
          platform: acceptCHPlatform,
        },
      },
      debug: {
        userAgentReceived: userAgent.substring(0, 150),
        headersCount: Object.keys(headers).length,
        hasClientHints: Object.keys(headers).some(h => h.startsWith('sec-ch')),
        clientHintsReceived: Object.keys(headers).filter(h => h.startsWith('sec-ch')),
      },
      raw: result // Para debug completo
    })

  } catch (error) {
    console.error('Erro 51Degrees:', error)
    return NextResponse.json(
      { error: 'Falha na detecção', details: String(error) },
      { status: 500 }
    )
  }
}
