import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error(`
Variáveis de ambiente do Supabase não configuradas.
Verifique se NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão definidas no .env.local
  `)
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-client-info': 'cashly-jornada-credito',
    }
  },
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

// Cache para evitar consultas repetidas
const cpfCache = new Map<string, { exists: boolean; leadId?: number; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Verificar se CPF existe e retornar dados do lead
export async function checkCPF(cpf: string): Promise<{ exists: boolean; leadId?: number; telefone?: string; blacklist?: boolean }> {
  const cleanCPF = cpf.replace(/\D/g, '')

  // Verificar cache
  const cached = cpfCache.get(cleanCPF)
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return { exists: cached.exists, leadId: cached.leadId }
  }

  const { data, error } = await supabase
    .from('lead')
    .select('id, telefone, Blacklist')
    .eq('cpf', cleanCPF)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Erro ao verificar CPF:', error)
    throw new Error('Erro ao verificar CPF')
  }

  const exists = !!data
  const result = {
    exists,
    leadId: data?.id,
    telefone: data?.telefone,
    blacklist: data?.Blacklist
  }

  // Salvar no cache
  cpfCache.set(cleanCPF, { exists, leadId: data?.id, timestamp: Date.now() })

  return result
}

// Criar nova jornada (device_modelo)
export async function createJourney(leadId: number, ipAddress?: string, userAgent?: string): Promise<{ id: number; token: string }> {
  const { data, error } = await supabase
    .from('device_modelo')
    .insert({
      lead_id: leadId,
      jornada_step: 'otp',
      status: 'in_progress',
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
    })
    .select('id, token')
    .single()

  if (error) {
    console.error('Erro ao criar jornada:', error)
    throw new Error('Erro ao criar jornada')
  }

  return { id: data.id, token: data.token }
}

// Buscar jornada ativa existente para o lead
// A jornada NÃO expira - apenas o OTP expira (20min)
// Reutiliza enquanto status = 'in_progress' E mesmo device (modelo)
export async function getActiveJourneyByLeadId(
  leadId: number,
  modelo?: string
): Promise<{ id: number; token: string; jornada_step: string } | null> {
  let query = supabase
    .from('device_modelo')
    .select('id, token, jornada_step, status, modelo')
    .eq('lead_id', leadId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)

  // Se modelo informado e não é "unknown", filtrar por ele
  if (modelo && modelo !== 'unknown') {
    query = query.eq('modelo', modelo)
  }

  const { data, error } = await query.single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Erro ao buscar jornada ativa:', error)
    return null
  }

  return data
}

// Buscar jornada por token
export async function getJourneyByToken(token: string) {
  const { data, error } = await supabase
    .from('device_modelo')
    .select(`
      *,
      lead:lead_id (
        id,
        cpf,
        nome,
        telefone,
        Blacklist
      )
    `)
    .eq('token', token)
    .single()

  if (error) {
    console.error('Erro ao buscar jornada:', error)
    return null
  }

  return data
}

// Atualizar step da jornada
export async function updateJourneyStep(
  journeyId: number,
  step: string,
  additionalData?: Record<string, unknown>
) {
  const timestampField = `${step}_checked_at`

  const updateData: Record<string, unknown> = {
    jornada_step: step,
    [timestampField]: new Date().toISOString(),
    ...additionalData
  }

  const { error } = await supabase
    .from('device_modelo')
    .update(updateData)
    .eq('id', journeyId)

  if (error) {
    console.error('Erro ao atualizar jornada:', error)
    throw new Error('Erro ao atualizar jornada')
  }
}

/**
 * Tipos de evento suportados para tracking comportamental
 *
 * Sessão: session_started, session_resumed, session_expired
 * Navegação: step_entered, step_completed, step_abandoned, step_back
 * Interação: button_clicked, link_clicked, input_focused, input_filled, form_error, checkbox_toggled
 * CPF: cpf_entered, cpf_valid, cpf_invalid, cpf_blacklisted
 * OTP: otp_requested, otp_resent, otp_digit_entered, otp_verified, otp_failed
 * Device: device_detected, device_eligible, device_ineligible
 * Renda: platform_selected, renda_validated
 * Oferta: oferta_viewed, oferta_accepted, oferta_rejected
 * Knox: knox_playstore_clicked, knox_imei_entered, knox_verified
 * Contrato: contrato_viewed, contrato_scrolled, contrato_terms_accepted, contrato_signed
 * Sucesso: journey_completed, mgm_code_copied, app_download_clicked
 * Mobile: app_backgrounded, app_foregrounded
 * Técnico: api_error, network_error
 */
export type JourneyEventType = string // Aceita qualquer string para flexibilidade

// Log de evento da jornada (analytics)
export async function logJourneyEvent(
  deviceModeloId: number,
  eventType: JourneyEventType,
  stepName: string,
  metadata?: Record<string, unknown>
) {
  const { error } = await supabase
    .from('journey_events')
    .insert({
      device_modelo_id: deviceModeloId,
      event_type: eventType,
      step_name: stepName,
      metadata,
    })

  if (error) {
    console.error('Erro ao logar evento:', error)
    // Não lançar erro, apenas logar
  }
}

// Verificar dispositivo elegível usando regex patterns
export async function checkDeviceEligibility(modelo: string, fabricante?: string): Promise<{ eligible: boolean; valorAprovado?: number; nomeComercial?: string }> {
  // Buscar todos os patterns ativos
  const { data, error } = await supabase
    .from('eligible_devices')
    .select('brand, model_pattern, description, active')
    .eq('active', true)

  if (error) {
    console.error('Erro ao verificar dispositivo:', error)
    throw new Error('Erro ao verificar dispositivo')
  }

  if (!data || data.length === 0) {
    return { eligible: false }
  }

  // Verificar se o modelo corresponde a algum pattern
  for (const device of data) {
    try {
      const regex = new RegExp(device.model_pattern, 'i')
      if (regex.test(modelo)) {
        // Valor aprovado fixo por enquanto (pode ser adicionado à tabela depois)
        return {
          eligible: true,
          valorAprovado: 1500, // Valor padrão
          nomeComercial: device.description
        }
      }
    } catch (e) {
      console.warn('Pattern regex inválido:', device.model_pattern)
    }
  }

  return { eligible: false }
}
