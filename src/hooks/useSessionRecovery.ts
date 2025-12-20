'use client'

import { useState, useEffect, useCallback } from 'react'
import { useJourneyStore, useHydration, isOtpValid } from '@/store/journey.store'
import type { JourneyStep, LeadData, DeviceInfo } from '@/types/journey.types'

interface SessionRecoveryResult {
  isLoading: boolean
  isValid: boolean
  needsOtp: boolean
  currentStep: JourneyStep | null
  error: string | null
}

interface JourneyValidateResponse {
  valid: boolean
  reason?: string
  journey?: {
    id: number
    step: JourneyStep
    otpValid: boolean
    otpVerifiedAt: number | null
    leadData: LeadData | null
    deviceInfo: DeviceInfo | null
    valorAprovado: number | null
    knoxImei: string | null
    contratoId: string | null
  }
}

export function useSessionRecovery(): SessionRecoveryResult {
  const hydrated = useHydration()
  const [isLoading, setIsLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [needsOtp, setNeedsOtp] = useState(false)
  const [currentStep, setCurrentStep] = useState<JourneyStep | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasValidated, setHasValidated] = useState(false)

  const {
    token,
    otpVerifiedAt,
    reset,
    clearForNewOtp,
    setLeadData,
    setJourneyData,
    setStep,
    setOtpVerified,
    setDeviceInfo,
    setValorAprovado,
    setKnoxImei,
    setContratoId,
    journeyId,
  } = useJourneyStore()

  const validateSession = useCallback(async () => {
    // Sem token = sem sessão
    if (!token) {
      setIsLoading(false)
      setIsValid(false)
      setCurrentStep('cpf')
      return
    }

    // Verificar primeiro se OTP está válido localmente (otimização)
    const otpValidLocal = isOtpValid(otpVerifiedAt)

    try {
      // Validar token no backend
      const response = await fetch('/api/journey/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data: JourneyValidateResponse = await response.json()

      if (!data.valid) {
        // Token inválido - limpar tudo
        if (data.reason === 'not_found' || data.reason === 'journey_expired') {
          reset()
          setIsValid(false)
          setCurrentStep('cpf')
        } else if (data.reason === 'journey_completed') {
          reset()
          setIsValid(false)
          setCurrentStep('cpf')
        }
        setIsLoading(false)
        return
      }

      // Token válido - sincronizar dados do backend
      const journey = data.journey!

      // Atualizar store com dados do backend
      if (journey.leadData) {
        setLeadData(journey.leadData)
      }

      if (journeyId !== journey.id) {
        setJourneyData(journey.id, token)
      }

      if (journey.deviceInfo) {
        setDeviceInfo(journey.deviceInfo)
      }

      if (journey.valorAprovado) {
        setValorAprovado(journey.valorAprovado)
      }

      if (journey.knoxImei) {
        setKnoxImei(journey.knoxImei)
      }

      if (journey.contratoId) {
        setContratoId(journey.contratoId)
      }

      // Verificar se OTP ainda é válido
      if (!journey.otpValid) {
        // OTP expirou - precisa validar novamente
        clearForNewOtp()
        setNeedsOtp(true)
        setCurrentStep('otp')
        setIsValid(true) // Sessão válida, mas precisa de OTP
      } else {
        // OTP válido - pode continuar
        setOtpVerified(true)
        setStep(journey.step as JourneyStep)
        setCurrentStep(journey.step as JourneyStep)
        setIsValid(true)
        setNeedsOtp(false)
      }
    } catch (err) {
      console.error('Erro ao validar sessão:', err)
      setError('Erro ao verificar sessão')
      // Em caso de erro de rede, usar dados locais
      if (otpValidLocal) {
        setIsValid(true)
        setNeedsOtp(false)
      } else {
        setIsValid(false)
      }
    } finally {
      setIsLoading(false)
    }
  }, [
    token,
    otpVerifiedAt,
    journeyId,
    reset,
    clearForNewOtp,
    setLeadData,
    setJourneyData,
    setStep,
    setOtpVerified,
    setDeviceInfo,
    setValorAprovado,
    setKnoxImei,
    setContratoId,
  ])

  useEffect(() => {
    // Aguardar hidratação antes de validar
    if (!hydrated) return

    // Só validar uma vez
    if (hasValidated) return

    setHasValidated(true)
    validateSession()
  }, [hydrated, hasValidated, validateSession])

  return {
    isLoading: !hydrated || isLoading,
    isValid,
    needsOtp,
    currentStep,
    error,
  }
}
