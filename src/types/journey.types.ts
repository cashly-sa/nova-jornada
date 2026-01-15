// Tipos da Jornada de Crédito

// Steps numerados para ordenação clara
// 00=CPF, 01=OTP, 02=Device, 03=Renda, 04=Oferta, 05=Knox, 06=Contrato, 07=Sucesso
export type JourneyStep =
  | '00' // CPF
  | '00b' // Cadastro
  | '01' // OTP
  | '02' // Device
  | '03' // Renda
  | '04' // Oferta
  | '05' // Knox
  | '06' // Contrato
  | '07' // Sucesso

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
  plataforma: 'uber' | '99' | 'ifood'
  dados_uber?: {
    ativo: boolean
    corridas_mes?: number
    faturamento_medio?: number
    avaliacao?: number
  }
  dados_99?: {
    ativo: boolean
    corridas_mes?: number
    faturamento_medio?: number
    avaliacao?: number
  }
  dados_ifood?: {
    ativo: boolean
    entregas_mes?: number
    faturamento_medio?: number
    avaliacao?: number
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

// Constantes de step para uso em logging/tracking (evita strings mágicas)
export const STEP_NAMES = {
  CPF: '00',
  CADASTRO: '00b',
  OTP: '01',
  DEVICE: '02',
  RENDA: '03',
  OFERTA: '04',
  KNOX: '05',
  CONTRATO: '06',
  SUCESSO: '07',
} as const

// Steps ordenados para barra de progresso
export const JOURNEY_STEPS: { key: JourneyStep; label: string }[] = [
  { key: '00', label: 'CPF' },
  { key: '01', label: 'Código' },
  { key: '02', label: 'Celular' },
  { key: '03', label: 'Renda' },
  { key: '04', label: 'Oferta' },
  { key: '05', label: 'Knox' },
  { key: '06', label: 'Contrato' },
  { key: '07', label: 'Sucesso' },
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
  '00': '/',
  '00b': '/cadastro',
  '01': '/credito/otp',
  '02': '/credito/device',
  '03': '/credito/renda',
  '04': '/credito/oferta',
  '05': '/credito/knox',
  '06': '/credito/contrato',
  '07': '/credito/sucesso',
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
