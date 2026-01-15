// Integração com Callbell WhatsApp API
// Documentação: https://docs.callbell.eu/

const CALLBELL_API_URL = 'https://api.callbell.eu/v1/messages/send'

interface SendWhatsAppOTPParams {
  to: string // Formato: +5511999999999
  code: string // Código OTP de 4 dígitos
}

interface CallbellResponse {
  contact?: {
    uuid: string
    name: string
    phone: string
  }
  message?: {
    uuid: string
    status: string
  }
  error?: string
}

export async function sendWhatsAppOTP({ to, code }: SendWhatsAppOTPParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.CALLBELL_API_KEY

  if (!apiKey) {
    console.error('Callbell API key not configured')
    return { success: false, error: 'WhatsApp service not configured' }
  }

  // Formatar número para padrão internacional
  let formattedNumber = to.replace(/\D/g, '')
  if (!formattedNumber.startsWith('55')) {
    formattedNumber = `55${formattedNumber}`
  }
  formattedNumber = `+${formattedNumber}`

  try {
    // Mensagem de texto com o código OTP
    const message = `*Cashly* - Seu código de verificação é: *${code}*\n\nEste código expira em 20 minutos.\nNão compartilhe este código com ninguém.`

    const channelUuid = process.env.CALLBELL_CHANNEL_UUID

    const response = await fetch(CALLBELL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedNumber,
        from: 'whatsapp',
        type: 'text',
        content: { text: message },
        ...(channelUuid && { channel_uuid: channelUuid }),
      })
    })

    const data: CallbellResponse = await response.json()

    if (response.ok && data.message?.uuid) {
      return {
        success: true,
        messageId: data.message.uuid
      }
    }

    return {
      success: false,
      error: data.error || 'Failed to send WhatsApp message'
    }
  } catch (error) {
    console.error('Callbell error:', error)
    return {
      success: false,
      error: 'Failed to connect to WhatsApp service'
    }
  }
}

// Função para gerar código OTP de 4 dígitos
export function generateOTPCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

// Função para criar hash do código (para armazenar no banco)
export async function hashOTPCode(code: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(code)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Função para verificar código OTP
export async function verifyOTPCode(code: string, hash: string): Promise<boolean> {
  const codeHash = await hashOTPCode(code)
  return codeHash === hash
}
