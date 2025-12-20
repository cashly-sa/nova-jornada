'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'
import type { JourneyStep, LeadData, DeviceInfo, RendaInfo } from '@/types/journey.types'

interface JourneyState {
  // Dados do lead
  cpf: string
  leadId: number | null
  leadData: LeadData | null
  isNewLead: boolean

  // Dados da jornada
  journeyId: number | null
  token: string | null
  currentStep: JourneyStep
  otpVerifiedAt: number | null // Timestamp de quando OTP foi verificado

  // Dados coletados
  otpVerified: boolean
  deviceInfo: DeviceInfo | null
  valorAprovado: number | null
  rendaInfo: RendaInfo | null
  knoxImei: string | null
  contratoId: string | null

  // Ações
  setCpf: (cpf: string) => void
  setLeadData: (data: LeadData, isNew?: boolean) => void
  setJourneyData: (journeyId: number, token: string) => void
  setStep: (step: JourneyStep) => void
  setOtpVerified: (verified: boolean) => void
  setDeviceInfo: (info: DeviceInfo) => void
  setValorAprovado: (valor: number) => void
  setRendaInfo: (info: RendaInfo) => void
  setKnoxImei: (imei: string) => void
  setContratoId: (id: string) => void
  reset: () => void
  clearForNewOtp: () => void // Limpa apenas flags de OTP mantendo journeyId
}

const initialState = {
  cpf: '',
  leadId: null,
  leadData: null,
  isNewLead: false,
  journeyId: null,
  token: null,
  currentStep: 'cpf' as JourneyStep,
  otpVerifiedAt: null,
  otpVerified: false,
  deviceInfo: null,
  valorAprovado: null,
  rendaInfo: null,
  knoxImei: null,
  contratoId: null,
}

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set) => ({
      ...initialState,

      setCpf: (cpf) => set({ cpf }),

      setLeadData: (data, isNew = false) => set({
        leadData: data,
        leadId: data.id,
        isNewLead: isNew,
      }),

      setJourneyData: (journeyId, token) => set({
        journeyId,
        token,
      }),

      setStep: (step) => set({ currentStep: step }),

      setOtpVerified: (verified) => set({
        otpVerified: verified,
        otpVerifiedAt: verified ? Date.now() : null,
      }),

      setDeviceInfo: (info) => set({ deviceInfo: info }),

      setValorAprovado: (valor) => set({ valorAprovado: valor }),

      setRendaInfo: (info) => set({ rendaInfo: info }),

      setKnoxImei: (imei) => set({ knoxImei: imei }),

      setContratoId: (id) => set({ contratoId: id }),

      reset: () => set(initialState),

      clearForNewOtp: () => set({
        otpVerified: false,
        otpVerifiedAt: null,
        currentStep: 'otp',
        // Mantém: journeyId, token, cpf, leadId, leadData
      }),
    }),
    {
      name: 'cashly-journey',
      partialize: (state) => ({
        cpf: state.cpf,
        leadId: state.leadId,
        leadData: state.leadData,
        journeyId: state.journeyId,
        token: state.token,
        currentStep: state.currentStep,
        otpVerified: state.otpVerified,
        otpVerifiedAt: state.otpVerifiedAt,
        deviceInfo: state.deviceInfo,
        valorAprovado: state.valorAprovado,
        rendaInfo: state.rendaInfo,
        knoxImei: state.knoxImei,
        contratoId: state.contratoId,
      }),
    }
  )
)

// Hook para aguardar hidratação do store usando API nativa do Zustand persist
export function useHydration() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Usar API nativa do Zustand persist para detectar hidratação
    const unsubscribe = useJourneyStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })

    // Verificar se já hidratou (caso o efeito rode depois)
    if (useJourneyStore.persist.hasHydrated()) {
      setHydrated(true)
    }

    return unsubscribe
  }, [])

  return hydrated
}

// Constante para tempo de expiração do OTP (20 minutos em ms)
export const OTP_EXPIRATION_MS = 20 * 60 * 1000

// Verifica se o OTP ainda está válido (< 20 minutos)
export function isOtpValid(otpVerifiedAt: number | null): boolean {
  if (!otpVerifiedAt) return false
  return Date.now() - otpVerifiedAt < OTP_EXPIRATION_MS
}
