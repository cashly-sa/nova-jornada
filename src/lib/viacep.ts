// Integração com API ViaCEP para busca de endereço

export interface ViaCEPResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  ibge: string
  gia: string
  ddd: string
  siafi: string
  erro?: boolean
}

export interface EnderecoData {
  endereco: string
  bairro: string
  cidade: string
  uf: string
}

export async function consultarCEP(cep: string): Promise<EnderecoData | null> {
  const cleanCEP = cep.replace(/\D/g, '')

  if (cleanCEP.length !== 8) {
    return null
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Erro na consulta do CEP')
    }

    const data: ViaCEPResponse = await response.json()

    if (data.erro) {
      return null
    }

    return {
      endereco: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      uf: data.uf || '',
    }
  } catch (error) {
    console.error('Erro ao consultar CEP:', error)
    return null
  }
}
