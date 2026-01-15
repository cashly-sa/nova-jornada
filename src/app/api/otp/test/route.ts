import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppOTP } from '@/lib/callbell'

const CALLBELL_API_URL = 'https://api.callbell.eu/v1/messages/send'

// GET: Verificar configuração das variáveis de ambiente
export async function GET() {
  const apiKey = process.env.CALLBELL_API_KEY
  const channelUuid = process.env.CALLBELL_CHANNEL_UUID

  return NextResponse.json({
    status: 'ok',
    env_check: {
      CALLBELL_API_KEY: apiKey ? `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}` : 'NOT SET',
      CALLBELL_CHANNEL_UUID: channelUuid || 'NOT SET (required for sending)',
      NODE_ENV: process.env.NODE_ENV || 'unknown',
    },
    api_configured: !!apiKey,
    channel_configured: !!channelUuid,
  })
}

// POST: Testar envio real de WhatsApp
export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { error: 'phone é obrigatório', example: { phone: '11999999999' } },
        { status: 400 }
      )
    }

    const apiKey = process.env.CALLBELL_API_KEY
    const channelUuid = process.env.CALLBELL_CHANNEL_UUID

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'CALLBELL_API_KEY não configurada',
        debug: { apiKey: 'NOT SET' }
      })
    }

    // Formatar número
    let formattedNumber = phone.replace(/\D/g, '')
    if (!formattedNumber.startsWith('55')) {
      formattedNumber = `55${formattedNumber}`
    }
    formattedNumber = `+${formattedNumber}`

    // Mensagem de texto com o código OTP
    const message = `*Cashly* - Seu código de verificação é: *1234*\n\nEste código expira em 20 minutos.\nNão compartilhe este código com ninguém.`

    // Payload que será enviado (formato correto da API Callbell)
    const payload: Record<string, unknown> = {
      to: formattedNumber,
      from: 'whatsapp',
      type: 'text',
      content: { text: message },
    }

    if (channelUuid) {
      payload.channel_uuid = channelUuid
    }

    console.log('📤 Enviando para Callbell:', JSON.stringify(payload, null, 2))

    // Fazer chamada à API
    const response = await fetch(CALLBELL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    const responseText = await response.text()
    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      data = { raw: responseText }
    }

    console.log('📥 Resposta Callbell:', response.status, JSON.stringify(data, null, 2))

    return NextResponse.json({
      success: response.ok,
      http_status: response.status,
      request: {
        url: CALLBELL_API_URL,
        phone_formatted: formattedNumber,
        template_uuid: templateUuid,
      },
      response: data,
    })

  } catch (error) {
    console.error('Erro no teste:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 })
  }
}
