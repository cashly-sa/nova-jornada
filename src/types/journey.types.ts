// Tipos da Jornada de Crédito

export type JourneyStep =
  | 'cpf'
  | 'cadastro'
  | 'otp'
  | 'device'
  | 'renda'
  | 'oferta'
  | 'knox'
  | 'contrato'
  | 'sucesso'

export type JourneyStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'expired'

export interface LeadData {
  id: number
  cpf: string
  nome: string
  telefone: string
  email?: string
  blacklist: boolean
}

export interface DeviceInfo {
  modelo: string
  fabricante: string
  userAgent: string
  nomeComercial?: string
}

export interface RendaInfo {
  plataforma: 'uber' | '99'
  dados_uber?: {
    ativo: boolean
    corridas_mes: number
    faturamento_medio: number
    avaliacao: number
  }
  dados_99?: {
    ativo: boolean
    corridas_mes: number
    faturamento_medio: number
    avaliacao: number
  }
  score?: number
}

export interface JourneyData {
  id: number
  token: string
  step: JourneyStep
  status: JourneyStatus
  leadId: number

  // Dados coletados
  deviceInfo?: DeviceInfo
  valorAprovado?: number
  rendaInfo?: RendaInfo
  knoxImei?: string
  contratoId?: string

  // Timestamps
  createdAt?: string
  otpVerifiedAt?: string
  deviceCheckedAt?: string
  rendaCheckedAt?: string
  ofertaAcceptedAt?: string
  knoxVerifiedAt?: string
  contratoSignedAt?: string
}

// Steps ordenados para barra de progresso
export const JOURNEY_STEPS: { key: JourneyStep; label: string }[] = [
  { key: 'cpf', label: 'CPF' },
  { key: 'otp', label: 'Código' },
  { key: 'device', label: 'Celular' },
  { key: 'renda', label: 'Renda' },
  { key: 'oferta', label: 'Oferta' },
  { key: 'knox', label: 'Knox' },
  { key: 'contrato', label: 'Contrato' },
  { key: 'sucesso', label: 'Sucesso' },
]

// Helper para obter índice do step
export function getStepIndex(step: JourneyStep): number {
  return JOURNEY_STEPS.findIndex(s => s.key === step)
}

// Helper para calcular progresso
export function getProgress(step: JourneyStep): number {
  const index = getStepIndex(step)
  if (index === -1) return 0
  return Math.round((index / (JOURNEY_STEPS.length - 1)) * 100)
}

// Mapeamento de step para rota
const STEP_ROUTES: Record<JourneyStep, string> = {
  cpf: '/',
  cadastro: '/cadastro',
  otp: '/credito/otp',
  device: '/credito/device',
  renda: '/credito/renda',
  oferta: '/credito/oferta',
  knox: '/credito/knox',
  contrato: '/credito/contrato',
  sucesso: '/credito/sucesso',
}

// Helper para obter rota do step
export function getRouteForStep(step: JourneyStep): string {
  return STEP_ROUTES[step] || '/'
}

// Verifica se pode acessar um step baseado no step atual
export function canAccessStep(currentStep: JourneyStep, targetStep: JourneyStep): boolean {
  const currentIndex = getStepIndex(currentStep)
  const targetIndex = getStepIndex(targetStep)
  return currentIndex >= targetIndex
}
