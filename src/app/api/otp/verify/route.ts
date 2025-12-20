import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashOTPCode } from '@/lib/clicksend'

/**
 * Verifica código OTP de forma ATÔMICA usando função PostgreSQL.
 * Isso resolve race conditions de double-click e garante consistência.
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

    // Chamar função atômica do PostgreSQL
    // Esta função faz SELECT + UPDATE + INSERT em uma única transação com lock
    const { data, error } = await supabase.rpc('verify_otp_atomic', {
      p_journey_id: journeyId,
      p_code_hash: codeHash,
    })

    if (error) {
      console.error('Erro na função verify_otp_atomic:', error)
      return NextResponse.json(
        { error: 'Erro interno ao verificar código' },
        { status: 500 }
      )
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
    console.error('Erro na verificação de OTP:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
