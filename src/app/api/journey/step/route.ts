import { NextRequest, NextResponse } from 'next/server'
import { updateJourneyStep } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { journeyId, step } = await request.json()

    if (!journeyId || !step) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Atualizar step no banco
    // Eventos são logados pelo frontend via useEventTracker com step correto
    await updateJourneyStep(journeyId, step)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar step:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
