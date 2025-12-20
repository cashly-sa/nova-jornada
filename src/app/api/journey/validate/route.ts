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
    if (journey.status !== 'in_progress') {
      return NextResponse.json(
        { valid: false, reason: 'journey_completed' },
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

    return NextResponse.json({
      valid: true,
      journey: {
        id: journey.id,
        step: journey.jornada_step,
        otpValid,
        otpVerifiedAt,
        leadData: lead ? {
          id: lead.id,
          cpf: lead.cpf,
          nome: lead.nome,
          telefone: lead.telefone,
          blacklist: lead.Blacklist,
        } : null,
        deviceInfo: journey.modelo ? {
          modelo: journey.modelo,
          fabricante: journey.fabricante,
        } : null,
        valorAprovado: journey.valor_aprovado,
        knoxImei: journey.knox_imei,
        contratoId: journey.contrato_id,
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
