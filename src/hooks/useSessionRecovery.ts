'use client'

import { useState, useEffect, useRef } from 'react'
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
    deviceAttempts: number
    deviceApproved: boolean
  }
}

export function useSessionRecovery(): SessionRecoveryResult {
  const hydrated = useHydration()
  const [isLoading, setIsLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [needsOtp, setNeedsOtp] = useState(false)
  const [currentStep, setCurrentStep] = useState<JourneyStep | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Usar ref para controlar estado da validação (evita race conditions)
  const validationStateRef = useRef<'idle' | 'validating' | 'done'>('idle')

  const {
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
  } = useJourneyStore()

  useEffect(() => {
    // Aguardar hidratação antes de validar
    if (!hydrated) return

    // Só validar uma vez (usando ref para evitar problemas com re-renders)
    if (validationStateRef.current !== 'idle') return
    validationStateRef.current = 'validating'

    // Função assíncrona inline para evitar problemas de closure
    const validateSession = async () => {
      // Ler estado atual do store (após hidratação garantida)
      const storeState = useJourneyStore.getState()
      const currentToken = storeState.token
      const currentOtpVerifiedAt = storeState.otpVerifiedAt
      const currentJourneyId = storeState.journeyId

      // Debug logs
      console.log('🔐 [Session] validateSession iniciada')
      console.log('🔐 [Session] hasHydrated:', useJourneyStore.persist.hasHydrated())
      console.log('🔐 [Session] token:', currentToken ? `${currentToken.slice(0, 8)}...` : 'null')
      console.log('🔐 [Session] journeyId:', currentJourneyId)

      // Sem token = sem sessão
      if (!currentToken) {
        console.log('🔐 [Session] Sem token, retornando sem sessão')
        validationStateRef.current = 'done'
        setIsLoading(false)
        setIsValid(false)
        setCurrentStep('00')
        return
      }

      // Verificar primeiro se OTP está válido localmente (otimização)
      const otpValidLocal = isOtpValid(currentOtpVerifiedAt)

      try {
        console.log('🔐 [Session] Chamando API validate com token:', currentToken.slice(0, 8) + '...')

        // Validar token no backend
        const response = await fetch('/api/journey/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: currentToken }),
        })

        const data: JourneyValidateResponse = await response.json()

        console.log('🔐 [Session] Resposta API:', { valid: data.valid, reason: data.reason })

        if (!data.valid) {
          console.log('🔐 [Session] Sessão inválida, reason:', data.reason)

          // Determinar ação baseada no motivo
          // Nota: device_rejected não existe mais - device rejeitado não muda status
          switch (data.reason) {
            case 'not_found':
              console.log('🔐 [Session] Token não encontrado no banco')
              reset()
              setIsValid(false)
              setCurrentStep('00')
              break

            case 'journey_expired':
              console.log('🔐 [Session] Jornada expirou (24h)')
              reset()
              setIsValid(false)
              setCurrentStep('00')
              break

            case 'journey_completed':
              console.log('🔐 [Session] Jornada já foi completada')
              reset()
              setIsValid(false)
              setCurrentStep('00')
              break

            case 'journey_abandoned':
              console.log('🔐 [Session] Jornada foi abandonada')
              reset()
              setIsValid(false)
              setCurrentStep('00')
              break

            default:
              console.log('🔐 [Session] Motivo desconhecido:', data.reason)
              reset()
              setIsValid(false)
              setCurrentStep('00')
          }

          validationStateRef.current = 'done'
          setIsLoading(false)
          return
        }

        // Token válido - sincronizar dados do backend
        const journey = data.journey!
        console.log('🔐 [Session] Sessão válida, step:', journey.step)

        // Atualizar store com dados do backend
        if (journey.leadData) {
          setLeadData(journey.leadData)
        }

        if (currentJourneyId !== journey.id) {
          setJourneyData(journey.id, currentToken)
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
          console.log('🔐 [Session] OTP expirado, redirecionando para OTP')
          clearForNewOtp()
          setNeedsOtp(true)
          setCurrentStep('01')
          setIsValid(true) // Sessão válida, mas precisa de OTP
        } else {
          // OTP válido - pode continuar
          console.log('🔐 [Session] OTP válido, continuando no step:', journey.step)
          setOtpVerified(true)
          setStep(journey.step as JourneyStep)
          setCurrentStep(journey.step as JourneyStep)
          setIsValid(true)
          setNeedsOtp(false)
        }
      } catch (err) {
        console.error('🔐 [Session] Erro ao validar sessão:', err)
        setError('Erro ao verificar sessão')
        // Em caso de erro de rede, usar dados locais
        if (otpValidLocal) {
          setIsValid(true)
          setNeedsOtp(false)
        } else {
          setIsValid(false)
        }
      } finally {
        validationStateRef.current = 'done'
        setIsLoading(false)
      }
    }

    validateSession()
  }, [
    hydrated,
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

  return {
    isLoading: !hydrated || isLoading,
    isValid,
    needsOtp,
    currentStep,
    error,
  }
}
