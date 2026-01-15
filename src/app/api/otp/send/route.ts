import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendWhatsAppOTP, generateOTPCode, hashOTPCode } from '@/lib/callbell'
import { STEP_NAMES } from '@/types/journey.types'

export async function POST(request: NextRequest) {
  try {
    const { journeyId, phone } = await request.json()

    if (!journeyId || !phone) {
      return NextResponse.json(
        { error: 'journeyId e phone são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se já existe OTP válido (não usado e não expirado)
    console.log('🔍 Verificando OTP existente para journeyId:', journeyId)
    const { data: existingOtp, error: otpError } = await supabase
      .from('otp_codes')
      .select('id, expires_at')
      .eq('device_modelo_id', journeyId)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    console.log('📋 OTP encontrado:', existingOtp, 'Erro:', otpError?.code)

    if (existingOtp) {
      // Já existe OTP válido, não enviar novo
      console.log('✅ OTP válido existe, não enviando novo')
      return NextResponse.json({
        success: true,
        message: 'Código já enviado',
        alreadySent: true,
      })
    }

    console.log('🆕 Nenhum OTP válido, gerando novo...')

    // Invalidar OTPs expirados (marcar como usados) para liberar a constraint única
    const { error: invalidateError } = await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('device_modelo_id', journeyId)
      .eq('used', false)
      .lt('expires_at', new Date().toISOString())

    if (invalidateError) {
      console.log('⚠️ Erro ao invalidar OTPs expirados:', invalidateError)
    } else {
      console.log('✅ OTPs expirados invalidados')
    }

    // Verificar rate limit (máximo 3 OTPs por hora para este telefone)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('device_modelo_id', journeyId)
      .gte('created_at', oneHourAgo)

    if ((count || 0) >= 3) {
      return NextResponse.json(
        { error: 'Limite de envios atingido. Tente novamente em 1 hora.' },
        { status: 429 }
      )
    }

    // Gerar código OTP
    const code = generateOTPCode()
    const codeHash = await hashOTPCode(code)

    // Salvar OTP no banco
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        device_modelo_id: journeyId,
        code_hash: codeHash,
        expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 minutos
      })

    if (insertError) {
      console.error('Erro ao salvar OTP:', insertError)
      return NextResponse.json(
        { error: 'Erro ao gerar código' },
        { status: 500 }
      )
    }

    // Enviar OTP via WhatsApp (Callbell)
    const whatsappResult = await sendWhatsAppOTP({ to: phone, code })

    if (!whatsappResult.success) {
      console.error('Erro ao enviar WhatsApp:', whatsappResult.error)
      // Em desenvolvimento, logar o código para testes
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Código OTP (dev):', code)
      }
    }

    // Log do evento
    await supabase
      .from('journey_events')
      .insert({
        device_modelo_id: journeyId,
        event_type: 'otp_sent',
        step_name: STEP_NAMES.OTP,
        metadata: { success: whatsappResult.success, channel: 'whatsapp' },
      })

    return NextResponse.json({
      success: true,
      message: 'Código enviado',
      // REMOVIDO: devCode - nunca expor OTP no response por segurança
    })

  } catch (error) {
    console.error('Erro no envio de OTP:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
