import { NextRequest, NextResponse } from 'next/server'
import { supabase, logJourneyEvent } from '@/lib/supabase'
import { hashOTPCode } from '@/lib/clicksend'
import { STEP_NAMES } from '@/types/journey.types'

/**
 * Verifica código OTP de forma ATÔMICA usando função PostgreSQL.
 * Se a função não existir, usa fallback com queries separadas.
 */
export async function POST(request: NextRequest) {
  try {
    const { journeyId, code } = await request.json()

    if (!journeyId || !code) {
      return NextResponse.json(
        { error: 'journeyId e code são obrigatórios' },
        { status: 400 }
      )
    }

    // Hash do código para comparação
    const codeHash = await hashOTPCode(code)

    // Tentar função atômica do PostgreSQL
    console.log('[OTP Verify] Chamando verify_otp_atomic, journeyId:', journeyId)

    const { data, error } = await supabase.rpc('verify_otp_atomic', {
      p_journey_id: journeyId,
      p_code_hash: codeHash,
    })

    console.log('[OTP Verify] Resultado RPC:', { data, error: error?.message })

    // Se a função não existir, usar fallback
    if (error) {
      console.error('[OTP Verify] Erro RPC:', error.message)

      // Função não existe - usar fallback
      if (error.message?.includes('function') || error.code === '42883') {
        console.log('[OTP Verify] Usando fallback (função não existe)')
        return await verifyOTPFallback(journeyId, codeHash)
      }

      return NextResponse.json(
        { error: 'Erro interno ao verificar código' },
        { status: 500 }
      )
    }

    // Se data é nulo, usar fallback
    if (!data) {
      console.log('[OTP Verify] Data nulo, usando fallback')
      return await verifyOTPFallback(journeyId, codeHash)
    }

    // Tratar resultado da função
    const result = data as {
      success: boolean
      error?: string
      message: string
      attempts?: number
    }

    if (!result.success) {
      // Mapear erros para status HTTP apropriados
      const statusMap: Record<string, number> = {
        not_found: 400,
        too_many_attempts: 429,
        invalid_code: 400,
        internal_error: 500,
      }

      return NextResponse.json(
        {
          error: result.message,
          attempts: result.attempts,
        },
        { status: statusMap[result.error || 'internal_error'] || 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    })

  } catch (error) {
    console.error('[OTP Verify] Erro geral:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * Fallback: verifica OTP usando queries separadas (menos seguro, mas funciona sem a função)
 */
async function verifyOTPFallback(journeyId: number, codeHash: string) {
  console.log('[OTP Fallback] Iniciando verificação')

  // 1. Buscar OTP válido
  const { data: otpRecord, error: otpError } = await supabase
    .from('otp_codes')
    .select('id, code_hash, attempts')
    .eq('device_modelo_id', journeyId)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (otpError || !otpRecord) {
    console.log('[OTP Fallback] OTP não encontrado:', otpError?.message)
    return NextResponse.json(
      { error: 'Código expirado ou não encontrado' },
      { status: 400 }
    )
  }

  // 2. Verificar tentativas
  if (otpRecord.attempts >= 3) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Solicite um novo código.' },
      { status: 429 }
    )
  }

  // 3. Verificar código
  if (otpRecord.code_hash !== codeHash) {
    // Incrementar tentativas
    await supabase
      .from('otp_codes')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('id', otpRecord.id)

    return NextResponse.json(
      {
        error: 'Código inválido',
        attempts: otpRecord.attempts + 1,
      },
      { status: 400 }
    )
  }

  // 4. Sucesso - marcar como usado
  await supabase
    .from('otp_codes')
    .update({ used: true })
    .eq('id', otpRecord.id)

  // 5. Atualizar jornada
  await supabase
    .from('device_modelo')
    .update({
      jornada_step: '02',
      otp_verified_at: new Date().toISOString(),
    })
    .eq('id', journeyId)

  // 6. Logar evento
  await logJourneyEvent(journeyId, 'otp_verified', STEP_NAMES.OTP)

  console.log('[OTP Fallback] Verificação concluída com sucesso')

  return NextResponse.json({
    success: true,
    message: 'Código verificado com sucesso',
  })
}
