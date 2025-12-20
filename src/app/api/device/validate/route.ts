import { NextRequest, NextResponse } from 'next/server'
import { supabase, logJourneyEvent, checkDeviceEligibility } from '@/lib/supabase'

/**
 * Valida device de forma IDEMPOTENTE usando Compare-And-Swap.
 * Se device_checked_at já estiver preenchido, retorna resultado anterior.
 */
export async function POST(request: NextRequest) {
  try {
    const { journeyId, modelo, fabricante, userAgent } = await request.json()

    if (!journeyId || !modelo) {
      return NextResponse.json(
        { error: 'journeyId e modelo são obrigatórios' },
        { status: 400 }
      )
    }

    // Primeiro, verificar se já foi validado (idempotência)
    const { data: existingJourney, error: fetchError } = await supabase
      .from('device_modelo')
      .select('device_checked_at, modelo, valor_aprovado, "Aprovado CEL"')
      .eq('id', journeyId)
      .single()

    if (fetchError) {
      console.error('Erro ao buscar jornada:', fetchError)
      return NextResponse.json(
        { error: 'Jornada não encontrada' },
        { status: 404 }
      )
    }

    // Se já foi validado, retorna resultado anterior (idempotente)
    if (existingJourney.device_checked_at) {
      return NextResponse.json({
        eligible: existingJourney['Aprovado CEL'],
        valorAprovado: existingJourney.valor_aprovado,
        modelo: existingJourney.modelo,
        alreadyChecked: true,
        message: 'Device já verificado anteriormente',
      })
    }

    // Verificar elegibilidade usando regex patterns
    const eligibilityResult = await checkDeviceEligibility(modelo, fabricante)

    const eligible = eligibilityResult.eligible
    const valorAprovado = eligibilityResult.valorAprovado || null
    const nomeComercial = eligibilityResult.nomeComercial || null

    // Atualizar device_modelo com CAS (Compare-And-Swap)
    // Só atualiza se device_checked_at ainda for NULL
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

    const { data: updateResult, error: updateError } = await supabase
      .from('device_modelo')
      .update(updateData)
      .eq('id', journeyId)
      .is('device_checked_at', null)  // CAS: só atualiza se ainda não foi verificado
      .select()

    if (updateError) {
      console.error('Erro ao atualizar device_modelo:', updateError)
      return NextResponse.json(
        { error: 'Erro ao processar' },
        { status: 500 }
      )
    }

    // Se não atualizou nenhum registro, significa que foi verificado por outra requisição
    if (!updateResult || updateResult.length === 0) {
      // Buscar resultado atual e retornar
      const { data: currentJourney } = await supabase
        .from('device_modelo')
        .select('modelo, valor_aprovado, "Aprovado CEL"')
        .eq('id', journeyId)
        .single()

      return NextResponse.json({
        eligible: currentJourney?.['Aprovado CEL'],
        valorAprovado: currentJourney?.valor_aprovado,
        modelo: currentJourney?.modelo,
        alreadyChecked: true,
        message: 'Device verificado por outra requisição',
      })
    }

    // Log do evento (só se realmente atualizou)
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
