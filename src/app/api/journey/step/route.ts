import { NextRequest, NextResponse } from 'next/server'
import { updateJourneyStep, logJourneyEvent } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { journeyId, step, eventType } = await request.json()

    if (!journeyId || !step) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Atualizar step no banco
    await updateJourneyStep(journeyId, step)

    // Logar evento se especificado
    if (eventType) {
      await logJourneyEvent(journeyId, eventType, step, {
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar step:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
