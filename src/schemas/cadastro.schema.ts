import { z } from 'zod'
import { validateCPF, validatePhone, validateDate } from '@/utils/validators'

// Schema para dados pessoais (Etapa 1)
export const dadosPessoaisSchema = z.object({
  fullName: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .refine(
      (name) => name.trim().split(/\s+/).length >= 2,
      'Informe nome e sobrenome'
    ),

  phone: z
    .string()
    .min(14, 'Telefone inválido')
    .max(15, 'Telefone inválido')
    .refine(
      (phone) => validatePhone(phone),
      'Telefone inválido'
    ),

  phone2: z
    .string()
    .optional()
    .refine(
      (phone) => !phone || phone.length === 0 || validatePhone(phone),
      'Telefone 2 inválido'
    ),

  email: z
    .string()
    .email('Email inválido')
    .toLowerCase(),

  birthDate: z
    .string()
    .min(10, 'Data inválida')
    .refine(
      (date) => validateDate(date),
      'Data de nascimento inválida'
    )
    .refine(
      (date) => {
        const parts = date.split('/')
        if (parts.length !== 3) return false
        const birthDate = new Date(
          parseInt(parts[2]),
          parseInt(parts[1]) - 1,
          parseInt(parts[0])
        )
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        return age >= 18
      },
      'Você deve ter pelo menos 18 anos'
    ),
})

// Schema para endereço (Etapa 2)
export const enderecoSchema = z.object({
  cep: z
    .string()
    .min(9, 'CEP inválido')
    .max(9, 'CEP inválido'),

  endereco: z
    .string()
    .min(1, 'Endereço obrigatório'),

  numero: z
    .string()
    .min(1, 'Número obrigatório'),

  complemento: z
    .string()
    .max(50, 'Complemento deve ter no máximo 50 caracteres')
    .optional(),

  bairro: z
    .string()
    .min(1, 'Bairro obrigatório'),

  cidade: z
    .string()
    .min(1, 'Cidade obrigatória'),

  uf: z
    .string()
    .length(2, 'UF deve ter 2 caracteres'),
})

export type DadosPessoaisData = z.infer<typeof dadosPessoaisSchema>
export type EnderecoData = z.infer<typeof enderecoSchema>
