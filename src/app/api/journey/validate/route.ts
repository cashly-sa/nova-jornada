import { NextRequest, NextResponse } from 'next/server'
import { getJourneyByToken } from '@/lib/supabase'

const OTP_EXPIRATION_MS = 20 * 60 * 1000 // 20 minutos

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { valid: false, reason: 'no_token' },
        { status: 400 }
      )
    }

    // Buscar jornada pelo token
    const journey = await getJourneyByToken(token)

    if (!journey) {
      return NextResponse.json(
        { valid: false, reason: 'not_found' },
        { status: 404 }
      )
    }

    // Verificar se jornada ainda está em progresso
    // Nota: device rejeitado NÃO muda status - usuário pode tentar outro device
    if (journey.status !== 'in_progress') {
      // Retornar motivo específico baseado no status
      const reasonMap: Record<string, string> = {
        completed: 'journey_completed',
        expired: 'journey_expired',
        abandoned: 'journey_abandoned',
      }
      const reason = reasonMap[journey.status] || 'journey_completed'

      return NextResponse.json(
        { valid: false, reason, status: journey.status },
        { status: 400 }
      )
    }

    // Verificar se jornada expirou (24 horas)
    if (journey.expires_at && new Date(journey.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, reason: 'journey_expired' },
        { status: 400 }
      )
    }

    // Verificar se OTP foi verificado e se ainda está válido (< 20 minutos)
    const otpVerifiedAt = journey.otp_verified_at
      ? new Date(journey.otp_verified_at).getTime()
      : null

    const otpValid = otpVerifiedAt
      ? Date.now() - otpVerifiedAt < OTP_EXPIRATION_MS
      : false

    // Extrair dados do lead
    const lead = journey.lead as {
      id: number
      cpf: string
      nome: string
      telefone: string
      Blacklist: boolean
    } | null

    // Debug log para verificar o que está sendo retornado
    console.log('🔍 [Validate API] Retornando jornada:', {
      id: journey.id,
      step: journey.jornada_step,
      status: journey.status,
      deviceAttempts: journey.device_attempts,
      deviceApproved: journey['Aprovado CEL'],
      modelo: journey.modelo,
    })

    return NextResponse.json({
      valid: true,
      journey: {
        id: journey.id,
        step: journey.jornada_step,
        otpValid,
        otpVerifiedAt,
        leadData: lead ? {
          id: lead.id,
          nome: lead.nome,
          // SEGURANÇA: CPF e telefone removidos do response
          // Acessar diretamente no banco quando necessário
        } : null,
        deviceInfo: journey.modelo ? {
          modelo: journey.modelo,
          fabricante: journey.fabricante,
        } : null,
        valorAprovado: journey.valor_aprovado,
        knoxImei: journey.knox_imei,
        contratoId: journey.contrato_id,
        deviceAttempts: journey.device_attempts || 0,
        deviceApproved: journey['Aprovado CEL'] || false,
      },
    })
  } catch (error) {
    console.error('Erro ao validar jornada:', error)
    return NextResponse.json(
      { valid: false, reason: 'internal_error' },
      { status: 500 }
    )
  }
}
