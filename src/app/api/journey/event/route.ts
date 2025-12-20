import { NextRequest, NextResponse } from 'next/server'
import { logJourneyEvent } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { journeyId, eventType, stepName, metadata } = await request.json()

    if (!journeyId || !eventType) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    await logJourneyEvent(journeyId, eventType, stepName || 'unknown', metadata)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao logar evento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
