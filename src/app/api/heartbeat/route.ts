import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const text = await request.text()
    const { journeyId } = JSON.parse(text)

    if (!journeyId) {
      return NextResponse.json({ error: 'Missing journeyId' }, { status: 400 })
    }

    await supabase
      .from('device_modelo')
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq('id', journeyId)
      .eq('status', 'in_progress')

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
