import { NextRequest, NextResponse } from 'next/server'
import { logJourneyEvent } from '@/lib/supabase'

/**
 * API para registrar abandono de jornada
 * Chamada via Beacon API quando usuário fecha aba/navegador
 */
export async function POST(request: NextRequest) {
  try {
    // Beacon API envia como text/plain, não application/json
    const text = await request.text()
    const { journeyId, stepName, timestamp } = JSON.parse(text)

    if (!journeyId || !stepName) {
      return NextResponse.json(
        { error: 'journeyId e stepName são obrigatórios' },
        { status: 400 }
      )
    }

    // Registrar evento de abandono
    await logJourneyEvent(
      journeyId,
      'journey_abandoned',
      stepName,
      { abandoned_at: timestamp }
    )

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao registrar abandono:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
