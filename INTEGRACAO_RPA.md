# Integracao RPA Cashly Connect

## Resumo

Integracao do widget RPA (Cashly Connect) no frontend Next.js para extracao de dados de ganhos das plataformas Uber, 99 e iFood.

**Projeto:** `/home/cashly/nova_jornada`

## Arquivos Principais

### Frontend (Next.js)
```
src/
├── app/credito/renda/page.tsx      # Pagina de renda (step 03) - onde usuario escolhe plataforma
├── components/CashlyConnectModal.tsx # Modal com iframe do widget RPA
├── lib/supabase.ts                  # Funcoes getLeadToken() e checkRendaApproval()
└── store/journey.store.ts           # Estado global com leadToken
```

### Backend (Python/Flask)
```
cashly_connect_99/
├── server/
│   ├── server.py           # API Flask (endpoints /api/start, /api/otp, etc)
│   ├── database.py         # Redis + anti-duplicidade
│   └── device_manager.py   # Gerenciamento de devices ADB
├── web/
│   ├── app.js              # Widget 99
│   ├── app_uber.js         # Widget Uber
│   └── app_ifood.js        # Widget iFood
└── rpa/
    ├── rpa_99.py           # RPA 99 Driver
    ├── rpa_uber.py         # RPA Uber
    └── rpa_ifood.py        # RPA iFood
```

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                           │
│                                                                 │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │ Pagina Renda│───>│CashlyConnectModal│───>│ Polling       │  │
│  │ (step 03)   │    │ (iframe)         │    │ Aprovacao     │  │
│  └─────────────┘    └──────────────────┘    └───────────────┘  │
│         │                    │                      │          │
│         │                    │                      │          │
│         ▼                    ▼                      ▼          │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │ leadToken   │    │ connect.cashly   │    │ device_modelo │  │
│  │ (store)     │    │ .com.br/{app}    │    │ uber/99/ifood │  │
│  └─────────────┘    │ ?uuid={token}    │    │ = TRUE        │  │
│                     └──────────────────┘    └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RPA SERVER (Python/Flask)                    │
│                                                                 │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │ Widget HTML │───>│ API /api/start   │───>│ Device Manager│  │
│  │ + JS        │    │ /api/otp         │    │ (ADB)         │  │
│  └─────────────┘    └──────────────────┘    └───────────────┘  │
│                              │                      │          │
│                              ▼                      ▼          │
│                     ┌──────────────────┐    ┌───────────────┐  │
│                     │ Webhook N8N      │───>│ Supabase      │  │
│                     │ (dados extraidos)│    │ device_modelo │  │
│                     └──────────────────┘    └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## URLs do Widget

| Plataforma | URL                                    |
|------------|----------------------------------------|
| 99 Driver  | `https://connect.cashly.com.br/?uuid={lead.token}` |
| Uber       | `https://connect.cashly.com.br/uber?uuid={lead.token}` |
| iFood      | `https://connect.cashly.com.br/ifood?uuid={lead.token}` |

## Token Utilizado

O parametro `uuid` na URL usa o **`lead.token`** (tabela `lead`, coluna `token`).

**Relacao:**
```
device_modelo.lead_id → lead.id → lead.token
```

**NAO confundir com:**
- `device_modelo.token` - Token da jornada de credito (diferente)

## Fluxo Completo

### 1. Usuario seleciona plataforma
```typescript
// src/app/credito/renda/page.tsx
const handleSelect = (selected: 'uber' | '99' | 'ifood') => {
  setSelectedPlatform(selected)
  setShowConnect(true)
}
```

### 2. Modal abre com iframe
```typescript
// src/components/CashlyConnectModal.tsx
const connectUrl = `https://connect.cashly.com.br/${platformPath}?uuid=${leadToken}`
```

### 3. Widget executa extracao
- Usuario insere telefone/CPF
- Recebe OTP via SMS
- RPA extrai dados do app
- Webhook envia para Supabase

### 4. Polling aguarda aprovacao
```typescript
// Verifica a cada 5s se uber/99_taxi/ifood = TRUE
const { approved } = await checkRendaApproval(journeyId)
```

### 5. Vendedor aprova manualmente
No painel admin ou Supabase, vendedor define:
- `device_modelo.uber = TRUE` ou
- `device_modelo.99_taxi = TRUE` ou
- `device_modelo.ifood = TRUE`

### 6. Frontend avanca para proxima etapa
Quando aprovado, usuario vai para step 04 (Oferta).

## Arquivos Modificados

### Frontend (Next.js)

| Arquivo | Descricao |
|---------|-----------|
| `src/lib/supabase.ts` | Funcoes `getLeadToken()` e `checkRendaApproval()` |
| `src/store/journey.store.ts` | Campo `leadToken` e acao `setLeadToken()` |
| `src/components/CashlyConnectModal.tsx` | Componente modal com iframe |
| `src/app/credito/renda/page.tsx` | Pagina de renda com 3 plataformas |

### Backend (Python/Flask)

| Arquivo | Descricao |
|---------|-----------|
| `cashly_connect_99/server/server.py` | API endpoints |
| `cashly_connect_99/server/database.py` | Redis + anti-duplicidade |
| `cashly_connect_99/server/device_manager.py` | Gerenciamento de devices |
| `cashly_connect_99/web/app.js` | Widget 99 |
| `cashly_connect_99/web/app_uber.js` | Widget Uber |
| `cashly_connect_99/web/app_ifood.js` | Widget iFood |

## Codigo Detalhado

### 1. Store (src/store/journey.store.ts)

Adicionado campo `leadToken` para armazenar o token do lead:

```typescript
// Linha 13
leadToken: string | null // Token do lead para RPA Cashly Connect

// Linha 32
setLeadToken: (token: string) => void

// Linha 49
leadToken: null,

// Linha 74
setLeadToken: (token) => set({ leadToken: token }),

// Linha 111 (persistido no localStorage)
leadToken: state.leadToken,
```

### 2. Supabase (src/lib/supabase.ts)

**getLeadToken** - Busca token do lead (linhas 225-238):
```typescript
export async function getLeadToken(leadId: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('lead')
    .select('token')
    .eq('id', leadId)
    .single()

  if (error) {
    console.error('Erro ao buscar lead token:', error)
    return null
  }
  return data?.token || null
}
```

**checkRendaApproval** - Verifica se vendedor aprovou (linhas 240-267):
```typescript
export async function checkRendaApproval(journeyId: number): Promise<{
  approved: boolean
  platform: 'uber' | '99' | 'ifood' | null
}> {
  const { data, error } = await supabase
    .from('device_modelo')
    .select('uber, "99_taxi", ifood')
    .eq('id', journeyId)
    .single()

  if (error) {
    console.error('Erro ao verificar aprovacao de renda:', error)
    return { approved: false, platform: null }
  }

  if (data?.uber === true) {
    return { approved: true, platform: 'uber' }
  }
  if (data?.['99_taxi'] === true) {
    return { approved: true, platform: '99' }
  }
  if (data?.ifood === true) {
    return { approved: true, platform: 'ifood' }
  }

  return { approved: false, platform: null }
}
```

### 3. Modal do Widget (src/components/CashlyConnectModal.tsx)

Componente completo que renderiza iframe:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'

const CASHLY_CONNECT_URL = 'https://connect.cashly.com.br'

interface CashlyConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onError?: (message: string) => void
  platform: 'uber' | '99' | 'ifood'
  leadToken: string
}

function getPlatformPath(platform: 'uber' | '99' | 'ifood'): string {
  switch (platform) {
    case 'uber': return '/uber'
    case 'ifood': return '/ifood'
    case '99':
    default: return '' // 99 é a raiz
  }
}

export function CashlyConnectModal({
  isOpen, onClose, onSuccess, onError, platform, leadToken,
}: CashlyConnectModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [iframeError, setIframeError] = useState(false)

  // URL do widget: connect.cashly.com.br/{platform}?uuid={leadToken}
  const platformPath = getPlatformPath(platform)
  const connectUrl = `${CASHLY_CONNECT_URL}${platformPath}?uuid=${leadToken}`

  // ... resto do componente (loading, error handling, iframe render)
}
```

### 4. Pagina de Renda (src/app/credito/renda/page.tsx)

**Step:** `03`
**URL:** `/credito/renda`

**Imports adicionados (linhas 16-17):**
```typescript
import { CashlyConnectModal } from '@/components/CashlyConnectModal'
import { getLeadToken, checkRendaApproval } from '@/lib/supabase'
```

**Estados (linhas 102-110):**
```typescript
const [plataforma, setPlataforma] = useState<'uber' | '99' | 'ifood' | ''>('')
const [status, setStatus] = useState<'form' | 'processing' | 'waiting_approval' | 'done' | 'error'>('form')
const [showConnect, setShowConnect] = useState(false)
const [selectedPlatform, setSelectedPlatform] = useState<'uber' | '99' | 'ifood' | null>(null)
```

**Busca leadToken ao montar (linhas 112-120):**
```typescript
useEffect(() => {
  async function fetchLeadToken() {
    if (!leadToken && leadId) {
      const token = await getLeadToken(leadId)
      if (token) {
        setLeadToken(token)
      }
    }
  }
  fetchLeadToken()
}, [leadId, leadToken, setLeadToken])
```

**Handler de selecao (linhas 109-124):**
```typescript
const handleSelect = (selected: 'uber' | '99' | 'ifood') => {
  if (!leadToken) {
    setError('Token do lead nao encontrado. Recarregue a pagina.')
    setStatus('error')
    return
  }
  setSelectedPlatform(selected)
  setPlataforma(selected)
  setShowConnect(true)
}
```

**Polling de aprovacao (linhas 139-207):**
```typescript
const startApprovalPolling = () => {
  const maxAttempts = 60 // 5 minutos (5s * 60)
  let attempts = 0

  const pollInterval = setInterval(async () => {
    attempts++
    const { approved, platform } = await checkRendaApproval(journeyId)

    if (approved) {
      clearInterval(pollInterval)
      setStatus('done')
      // Avanca para step 04
      router.replace('/credito/oferta')
    } else if (attempts >= maxAttempts) {
      clearInterval(pollInterval)
      setError('Tempo esgotado.')
      setStatus('error')
    }
  }, 5000)
}
```

**Render do modal (linhas 211-221):**
```typescript
{leadToken && (
  <CashlyConnectModal
    isOpen={showConnect}
    onClose={handleConnectClose}
    onSuccess={handleConnectSuccess}
    onError={handleConnectError}
    platform={selectedPlatform || 'uber'}
    leadToken={leadToken}
  />
)}
```

**Botoes de selecao (linhas 247-307):**
```typescript
<div className="grid grid-cols-3 gap-3 mt-8">
  <button onClick={() => handleSelect('uber')}>Uber</button>
  <button onClick={() => handleSelect('99')}>99</button>
  <button onClick={() => handleSelect('ifood')}>iFood</button>
</div>
```

## Tabela device_modelo

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | int | PK |
| `lead_id` | int | FK para lead.id |
| `token` | uuid | Token da jornada (NAO usar no RPA) |
| `uber` | boolean | Aprovacao Uber (NULL=pendente, TRUE=aprovado, FALSE=rejeitado) |
| `99_taxi` | boolean | Aprovacao 99 |
| `ifood` | boolean | Aprovacao iFood |
| `dados_uber` | jsonb | Dados extraidos Uber |
| `dados_99` | jsonb | Dados extraidos 99 |
| `dados_ifood` | jsonb | Dados extraidos iFood |

## Webhooks N8N

| Plataforma | URL |
|------------|-----|
| 99 | `https://n8n.cashly.com.br/webhook/connect-7ea6-4f00-8f32-7fe79a50a244` |
| Uber | `https://n8n.cashly.com.br/webhook/uber-e1d87eddc518` |
| iFood | `https://n8n.cashly.com.br/webhook/ifood-9b3d-4edf-aaef-42884af1c4f1` |

## Estados da Pagina de Renda

| Status | Descricao |
|--------|-----------|
| `form` | Selecao de plataforma |
| `processing` | Extraindo dados |
| `waiting_approval` | Aguardando vendedor aprovar |
| `done` | Aprovado, avancando para oferta |
| `error` | Erro ou timeout |

## Timeout

- Polling: 5 segundos entre verificacoes
- Maximo: 60 tentativas (5 minutos)
- Apos timeout: mostra erro e permite tentar novamente

## Como Testar

1. Iniciar o frontend Next.js:
```bash
cd /home/cashly/nova_jornada
npm run dev
```

2. Iniciar o servidor RPA:
```bash
cd /home/cashly/nova_jornada/cashly_connect_99
./start_server.sh
```

3. Acessar a jornada e chegar no step 03 (Renda)

4. Clicar em uma plataforma - modal deve abrir com URL:
   - `https://connect.cashly.com.br/?uuid={lead.token}` (99)
   - `https://connect.cashly.com.br/uber?uuid={lead.token}` (Uber)
   - `https://connect.cashly.com.br/ifood?uuid={lead.token}` (iFood)

5. Para aprovar manualmente no Supabase:
```sql
UPDATE device_modelo SET uber = true WHERE id = {journeyId};
-- ou
UPDATE device_modelo SET "99_taxi" = true WHERE id = {journeyId};
-- ou
UPDATE device_modelo SET ifood = true WHERE id = {journeyId};
```

6. Frontend deve detectar aprovacao e avancar para step 04

## Resumo das Mudancas Feitas

| Arquivo | Linha(s) | O que foi feito |
|---------|----------|-----------------|
| `src/store/journey.store.ts` | 13, 32, 49, 74, 111 | Adicionado `leadToken` ao estado |
| `src/lib/supabase.ts` | 225-267 | Funcoes `getLeadToken()` e `checkRendaApproval()` |
| `src/components/CashlyConnectModal.tsx` | Arquivo novo | Modal com iframe para widget RPA |
| `src/app/credito/renda/page.tsx` | 16-17, 67-88, 102-207, 211-307 | Integracao completa com 3 plataformas + polling |
