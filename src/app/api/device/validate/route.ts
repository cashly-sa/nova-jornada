import { NextRequest, NextResponse } from 'next/server'
import { supabase, logJourneyEvent, checkDeviceEligibility } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { journeyId, modelo, fabricante, userAgent } = await request.json()

    if (!journeyId || !modelo) {
      return NextResponse.json(
        { error: 'journeyId e modelo são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar elegibilidade usando regex patterns
    const eligibilityResult = await checkDeviceEligibility(modelo, fabricante)

    const eligible = eligibilityResult.eligible
    const valorAprovado = eligibilityResult.valorAprovado || null
    const nomeComercial = eligibilityResult.nomeComercial || null

    // Atualizar device_modelo com informações do dispositivo
    const updateData: Record<string, unknown> = {
      modelo,
      fabricante,
      user_agent: userAgent,
      device_checked_at: new Date().toISOString(),
      'Aprovado CEL': eligible,
    }

    if (eligible) {
      updateData.valor_aprovado = valorAprovado
      updateData.jornada_step = 'renda'
    } else {
      updateData.status = 'rejected'
      updateData.rejection_reason = 'device_not_eligible'
      updateData.jornada_step = 'rejected'
    }

    const { error: updateError } = await supabase
      .from('device_modelo')
      .update(updateData)
      .eq('id', journeyId)

    if (updateError) {
      console.error('Erro ao atualizar device_modelo:', updateError)
      return NextResponse.json(
        { error: 'Erro ao processar' },
        { status: 500 }
      )
    }

    // Log do evento
    await logJourneyEvent(
      journeyId,
      eligible ? 'step_completed' : 'rejection',
      'device',
      { modelo, fabricante, eligible, valorAprovado }
    )

    return NextResponse.json({
      eligible,
      valorAprovado,
      nomeComercial,
      modelo,
    })

  } catch (error) {
    console.error('Erro na validação de device:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
