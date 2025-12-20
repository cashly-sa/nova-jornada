// Validadores e formatadores - Reutilizados da jornada_antiga + novos

export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '')

  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false

  // Primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false

  // Segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false

  return true
}

export const formatCPF = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '')
  const match = cleanValue.match(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/)

  if (!match) return value

  const [, group1, group2, group3, group4] = match

  let formatted = group1
  if (group2) formatted += `.${group2}`
  if (group3) formatted += `.${group3}`
  if (group4) formatted += `-${group4}`

  return formatted
}

export const formatDate = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '')
  const match = cleanValue.match(/^(\d{0,2})(\d{0,2})(\d{0,4})$/)

  if (!match) return value

  const [, day, month, year] = match

  let formatted = day
  if (month) formatted += `/${month}`
  if (year) formatted += `/${year}`

  return formatted
}

export const validateDate = (dateString: string): boolean => {
  const cleanDate = dateString.replace(/\D/g, '')
  if (cleanDate.length !== 8) return false

  const day = parseInt(cleanDate.slice(0, 2))
  const month = parseInt(cleanDate.slice(2, 4))
  const year = parseInt(cleanDate.slice(4, 8))

  if (day < 1 || day > 31) return false
  if (month < 1 || month > 12) return false
  if (year < 1900 || year > new Date().getFullYear()) return false

  const date = new Date(year, month - 1, day)
  return date.getDate() === day &&
         date.getMonth() === month - 1 &&
         date.getFullYear() === year
}

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const formatCEP = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '')
  const match = cleanValue.match(/^(\d{0,5})(\d{0,3})$/)

  if (!match) return value

  const [, group1, group2] = match

  let formatted = group1
  if (group2) formatted += `-${group2}`

  return formatted
}

export const validateCEP = (cep: string): boolean => {
  const cleanCEP = cep.replace(/\D/g, '')
  return cleanCEP.length === 8
}

export const formatPhone = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '')
  const limitedValue = cleanValue.slice(0, 11)

  if (limitedValue.length === 0) return ''
  if (limitedValue.length <= 2) return `(${limitedValue}`
  if (limitedValue.length <= 7) return `(${limitedValue.slice(0, 2)}) ${limitedValue.slice(2)}`

  return `(${limitedValue.slice(0, 2)}) ${limitedValue.slice(2, 7)}-${limitedValue.slice(7)}`
}

export const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '')

  if (cleanPhone.length !== 10 && cleanPhone.length !== 11) return false

  const ddd = parseInt(cleanPhone.slice(0, 2))
  const validDDDs = [
    11, 12, 13, 14, 15, 16, 17, 18, 19,
    21, 22, 24,
    27, 28,
    31, 32, 33, 34, 35, 37, 38,
    41, 42, 43, 44, 45, 46,
    47, 48, 49,
    51, 53, 54, 55,
    61,
    62, 64,
    63,
    65, 66,
    67,
    68, 69,
    71, 73, 74, 75, 77,
    79,
    81, 87,
    82,
    83,
    84,
    85, 88,
    86, 89,
    91, 93, 94,
    92, 97,
    95,
    96,
    98, 99
  ]

  if (!validDDDs.includes(ddd)) return false

  if (cleanPhone.length === 11) {
    const firstDigit = parseInt(cleanPhone.charAt(2))
    return firstDigit === 9
  }

  if (cleanPhone.length === 10) {
    const firstDigit = parseInt(cleanPhone.charAt(2))
    return [2, 3, 4, 5].includes(firstDigit)
  }

  return true
}

// NOVO: Validação de IMEI (algoritmo Luhn)
export const validateIMEI = (imei: string): boolean => {
  const clean = imei.replace(/[\s-]/g, '')

  if (!/^\d{15}$/.test(clean)) return false

  let sum = 0
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(clean[i])
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }

  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === parseInt(clean[14])
}

export const formatIMEI = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '').slice(0, 15)
  return cleanValue
}

// NOVO: Validação de UUID
export const isValidUUID = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

// NOVO: Mascara telefone para exibição (oculta parte do número)
export const maskPhone = (phone: string): string => {
  const clean = phone.replace(/\D/g, '')
  if (clean.length < 4) return '****'
  return `*****${clean.slice(-4)}`
}

// NOVO: Limpar string para apenas números
export const onlyNumbers = (value: string): string => {
  return value.replace(/\D/g, '')
}

// NOVO: Formatar valor em reais
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
