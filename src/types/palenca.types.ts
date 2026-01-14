// Tipos para integração com Palenca Widget

export interface PalencaEvent {
  event: 'user_created' | 'connection_success' | 'connection_error'
  success: boolean
  data?: {
    user_id: string
    country: string
    platform: string
    account_id: string
  }
  error?: {
    code: string
    message: string
  }
}

export interface PalencaSuccessData {
  userId?: string
  platform?: string
  accountId?: string
}

export interface PalencaError {
  code: string
  message: string
}

// Configuração do widget Palenca
export const PALENCA_CONFIG = {
  widgetId: 'e9b64191-c59c-4fc3-89ec-5d1becdadc8f',
  baseUrl: 'https://connect.palenca.com',
  origin: 'https://connect.palenca.com',
  defaults: {
    countries: 'br',
    lang: 'pt',
    primaryColor: '2B46B9',
    backgroundColor: 'ffffff',
    fontFamily: 'Inter',
    borderRadius: 'rounded',
    textFieldStyle: 'filled',
    hidePrivacyUrl: 'true',
    hideRedirectUrl: 'true',
    hideLinkAccountUrl: 'true',
  },
} as const

// Helper para construir URL do widget
export function buildPalencaUrl(
  platform: 'uber' | '99',
  externalId?: string | number
): string {
  const params = new URLSearchParams({
    widget_id: PALENCA_CONFIG.widgetId,
    countries: PALENCA_CONFIG.defaults.countries,
    platforms: platform,
    lang: PALENCA_CONFIG.defaults.lang,
    primary_color: PALENCA_CONFIG.defaults.primaryColor,
    background_color: PALENCA_CONFIG.defaults.backgroundColor,
    font_family: PALENCA_CONFIG.defaults.fontFamily,
    border_radius: PALENCA_CONFIG.defaults.borderRadius,
    text_field_style: PALENCA_CONFIG.defaults.textFieldStyle,
    hide_privacy_url: PALENCA_CONFIG.defaults.hidePrivacyUrl,
    hide_redirect_url: PALENCA_CONFIG.defaults.hideRedirectUrl,
    hide_label: 'false',
    include_account_id: 'false',
    include_external_id: 'false',
  })

  if (externalId) {
    params.set('external_id', String(externalId))
  }

  return `${PALENCA_CONFIG.baseUrl}/?${params.toString()}`
}
