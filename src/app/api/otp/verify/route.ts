import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashOTPCode } from '@/lib/clicksend'

export async function POST(request: NextRequest) {
  try {
    const { journeyId, code } = await request.json()

    if (!journeyId || !code) {
      return NextResponse.json(
        { error: 'journeyId e code são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar OTP válido mais recente
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('device_modelo_id', journeyId)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !otpRecord) {
      return NextResponse.json(
        { error: 'Código expirado ou não encontrado' },
        { status: 400 }
      )
    }

    // Verificar tentativas
    if (otpRecord.attempts >= 3) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Solicite um novo código.' },
        { status: 429 }
      )
    }

    // Verificar código
    const codeHash = await hashOTPCode(code)
    const isValid = codeHash === otpRecord.code_hash

    if (!isValid) {
      // Incrementar tentativas
      await supabase
        .from('otp_codes')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id)

      // Log do evento
      await supabase
        .from('journey_events')
        .insert({
          device_modelo_id: journeyId,
          event_type: 'otp_failed',
          step_name: 'otp',
          metadata: { attempts: otpRecord.attempts + 1 },
        })

      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 }
      )
    }

    // Marcar OTP como usado
    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('id', otpRecord.id)

    // Atualizar jornada
    await supabase
      .from('device_modelo')
      .update({
        jornada_step: 'device',
        otp_verified_at: new Date().toISOString(),
      })
      .eq('id', journeyId)

    // Log do evento
    await supabase
      .from('journey_events')
      .insert({
        device_modelo_id: journeyId,
        event_type: 'otp_verified',
        step_name: 'otp',
      })

    return NextResponse.json({
      success: true,
      message: 'Código verificado com sucesso',
    })

  } catch (error) {
    console.error('Erro na verificação de OTP:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
