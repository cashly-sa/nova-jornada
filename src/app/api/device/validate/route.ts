import { NextRequest, NextResponse } from 'next/server'
import { supabase, logJourneyEvent, checkDeviceEligibility } from '@/lib/supabase'
import { STEP_NAMES } from '@/types/journey.types'

/**
 * Valida device de forma IDEMPOTENTE usando Compare-And-Swap.
 * Se device_checked_at já estiver preenchido, retorna resultado anterior.
 */
export async function POST(request: NextRequest) {
  try {
    const {
      journeyId,
      modelo,
      fabricante,
      userAgent,
      detection_source,    // Camada que detectou o device
      detection_confidence // Score de confiança (0-100)
    } = await request.json()

    if (!journeyId || !modelo) {
      return NextResponse.json(
        { error: 'journeyId e modelo são obrigatórios' },
        { status: 400 }
      )
    }

    // Primeiro, verificar estado atual da jornada
    const { data: existingJourney, error: fetchError } = await supabase
      .from('device_modelo')
      .select('device_checked_at, modelo, valor_aprovado, "Aprovado CEL", device_attempts')
      .eq('id', journeyId)
      .single()

    if (fetchError) {
      console.error('Erro ao buscar jornada:', fetchError)
      return NextResponse.json(
        { error: 'Jornada não encontrada' },
        { status: 404 }
      )
    }

    // Se já foi validado E aprovado, retorna resultado anterior (idempotente)
    // Se foi rejeitado anteriormente, permite nova tentativa
    if (existingJourney.device_checked_at && existingJourney['Aprovado CEL']) {
      return NextResponse.json({
        eligible: true,
        valorAprovado: existingJourney.valor_aprovado,
        modelo: existingJourney.modelo,
        alreadyChecked: true,
        message: 'Device já verificado e aprovado anteriormente',
      })
    }

    // Contador de tentativas atual e modelo anterior
    const currentAttempts = existingJourney.device_attempts || 0
    const previousModelo = existingJourney.modelo

    // Verificar elegibilidade usando regex patterns
    const eligibilityResult = await checkDeviceEligibility(modelo, fabricante)

    const eligible = eligibilityResult.eligible
    const valorAprovado = eligibilityResult.valorAprovado || null
    const nomeComercial = eligibilityResult.nomeComercial || null

    // Lógica de device_attempts:
    // - Mesmo modelo + não elegível: incrementa (tentativa repetida)
    // - Modelo diferente + não elegível: reseta para 1 (nova tentativa com outro device)
    // - Elegível (aprovado): reseta para 0 (sucesso)
    const isSameModel = previousModelo === modelo
    let newAttempts: number
    if (eligible) {
      newAttempts = 0 // Sucesso - reseta contador
    } else if (isSameModel) {
      newAttempts = currentAttempts + 1 // Mesmo modelo rejeitado - incrementa
    } else {
      newAttempts = 1 // Modelo diferente rejeitado - primeira tentativa com este device
    }

    // Preparar dados de atualização
    const updateData: Record<string, unknown> = {
      modelo,
      fabricante,
      user_agent: userAgent,
      'Aprovado CEL': eligible,
      device_attempts: newAttempts,
      // Campos de rastreamento de detecção
      detection_source: detection_source || 'unknown',
      detection_confidence: detection_confidence || 0,
    }

    if (eligible) {
      // Device aprovado - marcar como verificado e avançar
      updateData.device_checked_at = new Date().toISOString()
      updateData.valor_aprovado = valorAprovado
      updateData.jornada_step = '03'
    } else {
      // Device rejeitado - NÃO muda status, permite nova tentativa
      // device_checked_at fica NULL para permitir nova verificação
      updateData.device_checked_at = null
      updateData.rejection_reason = 'device_not_eligible'
      updateData.jornada_step = '02' // Permanece no step 02 (device)
      // status permanece 'in_progress'
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
      eligible ? 'step_completed' : 'device_rejected',
      STEP_NAMES.DEVICE,
      { modelo, fabricante, eligible, valorAprovado, attempts: newAttempts }
    )

    return NextResponse.json({
      eligible,
      valorAprovado,
      nomeComercial,
      modelo,
      attempts: newAttempts,
      canRetry: !eligible, // Se não elegível, pode tentar novamente
    })

  } catch (error) {
    console.error('Erro na validação de device:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
