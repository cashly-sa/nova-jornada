'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MobileOnly } from '@/components/MobileOnly'
import { CashlyLogo } from '@/components/CashlyLogo'
import { useJourneyStore } from '@/store/journey.store'
import { supabase, createJourney, getActiveJourneyByLeadId } from '@/lib/supabase'
import { consultarCEP } from '@/lib/viacep'
import { detectDevice } from '@/lib/device-detection'
import {
  dadosPessoaisSchema,
  enderecoSchema,
  type DadosPessoaisData,
  type EnderecoData,
} from '@/schemas/cadastro.schema'
import {
  formatPhone,
  formatDate,
  formatCEP,
} from '@/utils/validators'

export default function CadastroPage() {
  const router = useRouter()
  const { cpf, setLeadData, setJourneyData, setStep } = useJourneyStore()

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [dadosPessoais, setDadosPessoais] = useState<DadosPessoaisData | null>(null)

  // Redirecionar se não tiver CPF
  useEffect(() => {
    if (!cpf) {
      router.push('/')
    }
  }, [cpf, router])

  // Form Etapa 1 - Dados Pessoais
  const form1 = useForm<DadosPessoaisData>({
    resolver: zodResolver(dadosPessoaisSchema),
    mode: 'onBlur',
  })

  // Form Etapa 2 - Endereço
  const form2 = useForm<EnderecoData>({
    resolver: zodResolver(enderecoSchema),
    mode: 'onBlur',
  })

  // Handler para buscar CEP
  const handleCEPChange = useCallback(async (value: string) => {
    const formatted = formatCEP(value)
    form2.setValue('cep', formatted)

    if (formatted.replace(/\D/g, '').length === 8) {
      const endereco = await consultarCEP(formatted)
      if (endereco) {
        form2.setValue('endereco', endereco.endereco)
        form2.setValue('bairro', endereco.bairro)
        form2.setValue('cidade', endereco.cidade)
        form2.setValue('uf', endereco.uf)
      }
    }
  }, [form2])

  // Submit Etapa 1
  const onSubmitStep1 = (data: DadosPessoaisData) => {
    setDadosPessoais(data)
    setCurrentStep(2)
  }

  // Submit Etapa 2 (Final)
  const onSubmitStep2 = async (enderecoData: EnderecoData) => {
    if (!dadosPessoais || !cpf) return

    setIsLoading(true)

    try {
      // Preparar dados para inserção
      const formatPhoneForDB = (phone: string) => {
        const clean = phone.replace(/\D/g, '')
        return clean.length === 11 ? `55${clean}` : clean
      }

      const leadData = {
        nome: dadosPessoais.fullName.trim(),
        email: dadosPessoais.email.toLowerCase().trim(),
        cpf: cpf,
        telefone: formatPhoneForDB(dadosPessoais.phone),
        Telefone2: dadosPessoais.phone2 ? formatPhoneForDB(dadosPessoais.phone2) : null,
        data_nascimento: dadosPessoais.birthDate,
        endereco: enderecoData.endereco.trim(),
        numero: enderecoData.numero.trim(),
        complemento: enderecoData.complemento?.trim() || null,
        bairro: enderecoData.bairro.trim(),
        cep: enderecoData.cep.replace(/\D/g, ''),
        cidade: enderecoData.cidade.trim(),
        uf: enderecoData.uf.toUpperCase().trim(),
        etapa: 'Novo',
        airtable: false,
        Blacklist: false,
        'Proibido Adiar': false,
        juridico: false,
        google_enviado: false,
        pagar_mgm: false,
        mgm_pix_processado: false,
      }

      // Inserir lead
      const { data: insertedLead, error } = await supabase
        .from('lead')
        .insert(leadData)
        .select('id, nome, telefone')
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Salvar no store
      setLeadData({
        id: insertedLead.id,
        cpf: cpf,
        nome: insertedLead.nome,
        telefone: insertedLead.telefone,
        blacklist: false,
      }, true)

      // Detectar device atual para buscar jornada do mesmo device
      const currentDevice = await detectDevice()

      // Verificar se já existe jornada ativa para este device (edge case)
      const existingJourney = await getActiveJourneyByLeadId(insertedLead.id, currentDevice.modelo)

      let journeyId: number
      let journeyToken: string

      if (existingJourney) {
        journeyId = existingJourney.id
        journeyToken = existingJourney.token
      } else {
        // Criar nova jornada
        const newJourney = await createJourney(insertedLead.id)
        journeyId = newJourney.id
        journeyToken = newJourney.token
      }

      setJourneyData(journeyId, journeyToken)
      setStep('01')

      // Ir para OTP
      router.push('/credito/otp')

    } catch (err) {
      console.error('Erro ao salvar:', err)
      form2.setError('root', {
        message: 'Erro ao salvar cadastro. Tente novamente.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!cpf) {
    return null
  }

  return (
    <MobileOnly>
      <main className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="pt-6 pb-2">
          <CashlyLogo size="sm" />
        </div>

        {/* Progress */}
        <div className="px-4 mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${currentStep >= 1 ? 'bg-primary' : 'bg-gray-300'}`} />
            <div className={`w-12 h-1 rounded ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-300'}`} />
            <div className={`w-3 h-3 rounded-full ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-300'}`} />
          </div>
          <p className="text-center text-sm text-text-secondary">
            Etapa {currentStep} de 2
          </p>
        </div>

        {/* Conteúdo */}
        <div className="journey-content container-mobile">
          {currentStep === 1 ? (
            <div className="card animate-slide-up">
              <h1 className="page-title">Seus dados</h1>
              <p className="page-subtitle">Preencha seus dados pessoais</p>

              <form onSubmit={form1.handleSubmit(onSubmitStep1)} className="space-y-4">
                {/* CPF (readonly) */}
                <div>
                  <label className="label">CPF</label>
                  <input
                    type="text"
                    value={cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                    className="input-field bg-gray-100"
                    disabled
                  />
                </div>

                {/* Nome */}
                <div>
                  <label className="label">Nome completo</label>
                  <input
                    {...form1.register('fullName')}
                    type="text"
                    placeholder="Seu nome completo"
                    className={`input-field ${form1.formState.errors.fullName ? 'border-error' : ''}`}
                  />
                  {form1.formState.errors.fullName && (
                    <p className="error-message">{form1.formState.errors.fullName.message}</p>
                  )}
                </div>

                {/* Telefone */}
                <div>
                  <label className="label">Telefone</label>
                  <input
                    {...form1.register('phone')}
                    type="tel"
                    inputMode="numeric"
                    placeholder="(11) 99999-9999"
                    className={`input-field ${form1.formState.errors.phone ? 'border-error' : ''}`}
                    onChange={(e) => form1.setValue('phone', formatPhone(e.target.value))}
                  />
                  {form1.formState.errors.phone && (
                    <p className="error-message">{form1.formState.errors.phone.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="label">Email</label>
                  <input
                    {...form1.register('email')}
                    type="email"
                    placeholder="seu@email.com"
                    className={`input-field ${form1.formState.errors.email ? 'border-error' : ''}`}
                  />
                  {form1.formState.errors.email && (
                    <p className="error-message">{form1.formState.errors.email.message}</p>
                  )}
                </div>

                {/* Data de Nascimento */}
                <div>
                  <label className="label">Data de nascimento</label>
                  <input
                    {...form1.register('birthDate')}
                    type="tel"
                    inputMode="numeric"
                    placeholder="DD/MM/AAAA"
                    className={`input-field ${form1.formState.errors.birthDate ? 'border-error' : ''}`}
                    onChange={(e) => form1.setValue('birthDate', formatDate(e.target.value))}
                    maxLength={10}
                  />
                  {form1.formState.errors.birthDate && (
                    <p className="error-message">{form1.formState.errors.birthDate.message}</p>
                  )}
                </div>

                <button type="submit" className="btn-primary mt-6">
                  Continuar
                </button>
              </form>
            </div>
          ) : (
            <div className="card animate-slide-up">
              <h1 className="page-title">Seu endereço</h1>
              <p className="page-subtitle">Informe seu endereço completo</p>

              <form onSubmit={form2.handleSubmit(onSubmitStep2)} className="space-y-4">
                {/* CEP */}
                <div>
                  <label className="label">CEP</label>
                  <input
                    {...form2.register('cep')}
                    type="tel"
                    inputMode="numeric"
                    placeholder="00000-000"
                    className={`input-field ${form2.formState.errors.cep ? 'border-error' : ''}`}
                    onChange={(e) => handleCEPChange(e.target.value)}
                    maxLength={9}
                  />
                  {form2.formState.errors.cep && (
                    <p className="error-message">{form2.formState.errors.cep.message}</p>
                  )}
                </div>

                {/* Endereço */}
                <div>
                  <label className="label">Endereço</label>
                  <input
                    {...form2.register('endereco')}
                    type="text"
                    placeholder="Rua, Avenida..."
                    className={`input-field ${form2.formState.errors.endereco ? 'border-error' : ''}`}
                  />
                  {form2.formState.errors.endereco && (
                    <p className="error-message">{form2.formState.errors.endereco.message}</p>
                  )}
                </div>

                {/* Número e Complemento */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Número</label>
                    <input
                      {...form2.register('numero')}
                      type="text"
                      placeholder="123"
                      className={`input-field ${form2.formState.errors.numero ? 'border-error' : ''}`}
                    />
                    {form2.formState.errors.numero && (
                      <p className="error-message">{form2.formState.errors.numero.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Complemento</label>
                    <input
                      {...form2.register('complemento')}
                      type="text"
                      placeholder="Apto, Bloco..."
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Bairro */}
                <div>
                  <label className="label">Bairro</label>
                  <input
                    {...form2.register('bairro')}
                    type="text"
                    placeholder="Bairro"
                    className={`input-field ${form2.formState.errors.bairro ? 'border-error' : ''}`}
                  />
                  {form2.formState.errors.bairro && (
                    <p className="error-message">{form2.formState.errors.bairro.message}</p>
                  )}
                </div>

                {/* Cidade e UF */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="label">Cidade</label>
                    <input
                      {...form2.register('cidade')}
                      type="text"
                      placeholder="Cidade"
                      className={`input-field ${form2.formState.errors.cidade ? 'border-error' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="label">UF</label>
                    <input
                      {...form2.register('uf')}
                      type="text"
                      placeholder="SP"
                      className={`input-field ${form2.formState.errors.uf ? 'border-error' : ''}`}
                      maxLength={2}
                    />
                  </div>
                </div>

                {form2.formState.errors.root && (
                  <p className="error-message text-center">
                    {form2.formState.errors.root.message}
                  </p>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="btn-secondary flex-1"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary flex-1"
                  >
                    {isLoading ? 'Salvando...' : 'Continuar'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </MobileOnly>
  )
}
