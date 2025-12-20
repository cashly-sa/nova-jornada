// Integração com ClickSend SMS API
// Documentação: https://developers.clicksend.com/docs/rest/v3/

const CLICKSEND_API_URL = 'https://rest.clicksend.com/v3/sms/send'

interface SendSMSParams {
  to: string // Formato: +5511999999999
  message: string
}

interface ClickSendResponse {
  http_code: number
  response_code: string
  response_msg: string
  data: {
    total_price: number
    total_count: number
    queued_count: number
    messages: Array<{
      message_id: string
      status: string
    }>
  }
}

export async function sendSMS({ to, message }: SendSMSParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const username = process.env.CLICKSEND_USERNAME
  const apiKey = process.env.CLICKSEND_API_KEY

  if (!username || !apiKey) {
    console.error('ClickSend credentials not configured')
    return { success: false, error: 'SMS service not configured' }
  }

  // Formatar número para padrão internacional
  let formattedNumber = to.replace(/\D/g, '')
  if (!formattedNumber.startsWith('55')) {
    formattedNumber = `55${formattedNumber}`
  }
  formattedNumber = `+${formattedNumber}`

  try {
    const auth = Buffer.from(`${username}:${apiKey}`).toString('base64')

    const response = await fetch(CLICKSEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            to: formattedNumber,
            body: message,
            from: 'Cashly',
          }
        ]
      })
    })

    const data: ClickSendResponse = await response.json()

    if (data.response_code === 'SUCCESS') {
      return {
        success: true,
        messageId: data.data?.messages?.[0]?.message_id
      }
    }

    return {
      success: false,
      error: data.response_msg || 'Failed to send SMS'
    }
  } catch (error) {
    console.error('ClickSend error:', error)
    return {
      success: false,
      error: 'Failed to connect to SMS service'
    }
  }
}

// Função para gerar código OTP de 6 dígitos
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
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
