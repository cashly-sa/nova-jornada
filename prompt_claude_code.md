# Prompt para Claude Code - Jornada de Crédito Cashly

> **Copie todo o conteúdo abaixo e cole no Claude Code do VS Code**

---

## Contexto do Projeto

Estou construindo uma jornada de captação de clientes para crédito. Atualmente o cliente precisa baixar um APP para saber se é elegível - queremos eliminar isso.

A nova jornada será 100% web, contínua, sem login tradicional (apenas OTP por SMS).

### Regras de Negócio Importantes

1. **Sistema MGM é separado** - Já existe um sistema de indicações em `mgm.cashly.com.br/{lead.token}`. NÃO usar esse token para a jornada de crédito.

2. **Tabela lead NÃO deve ser alterada** - Apenas consultar. Os dados de jornada ficam em `device_modelo`.

3. **Um lead pode ter várias jornadas** - Cada tentativa de crédito cria um novo registro em `device_modelo`.

4. **Autenticação por OTP SMS** - Sem senha, sem magic link.

---

## Stack Obrigatória

- **Frontend:** Next.js 14 (App Router) + TypeScript
- **UI:** Tailwind CSS + Shadcn/ui
- **Backend:** Supabase (Edge Functions + PostgreSQL)
- **Autenticação:** OTP via SMS (sem senha)
- **Estado:** JWT (localStorage) + Zustand
- **SMS:** Preparar para Twilio (mock inicial)

---

## Estrutura do Projeto

Crie a seguinte estrutura:

```
jornada-credito/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Landing - Input de CPF
│   │   ├── otp/page.tsx                # Verificação OTP
│   │   ├── device/page.tsx             # Verificação de device
│   │   ├── renda/page.tsx              # Validação Uber/99
│   │   ├── oferta/page.tsx             # Apresentação da oferta
│   │   ├── knox/page.tsx               # Enrollment Knox
│   │   ├── contrato/page.tsx           # Assinatura do contrato
│   │   ├── sucesso/page.tsx            # Conclusão
│   │   └── j/
│   │       └── [token]/page.tsx        # Acesso direto por token da jornada
│   ├── components/
│   │   ├── ui/                         # Shadcn components
│   │   └── jornada/
│   │       ├── ProgressBar.tsx         # Indicador de etapas
│   │       ├── CPFInput.tsx            # Input com máscara
│   │       ├── OTPInput.tsx            # 6 dígitos
│   │       ├── DeviceCheck.tsx         # Verificação de device
│   │       ├── RendaForm.tsx           # Form Uber/99
│   │       ├── OfertaCard.tsx          # Card com valores
│   │       ├── KnoxInstructions.tsx    # Instruções Knox
│   │       └── ContratoViewer.tsx      # Visualizador PDF
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Cliente browser
│   │   │   ├── server.ts               # Cliente server
│   │   │   └── types.ts                # Tipos gerados
│   │   ├── auth/
│   │   │   ├── jwt.ts                  # Gerar/validar JWT
│   │   │   ├── otp.ts                  # Gerar/validar OTP
│   │   │   └── session.ts              # Gerenciar sessão
│   │   ├── validation/
│   │   │   ├── cpf.ts                  # Validar CPF
│   │   │   └── device.ts               # Verificar elegibilidade
│   │   └── utils/
│   │       ├── masks.ts                # Máscaras de input
│   │       └── analytics.ts            # Track de eventos
│   ├── stores/
│   │   └── journeyStore.ts             # Zustand store
│   ├── hooks/
│   │   ├── useJourney.ts               # Hook principal
│   │   ├── useDevice.ts                # Detectar device
│   │   └── usePolling.ts               # Polling para RPA
│   └── types/
│       └── index.ts
├── supabase/
│   ├── migrations/
│   │   └── 001_jornada_credito.sql
│   └── functions/
│       ├── iniciar-jornada/index.ts
│       ├── validar-otp/index.ts
│       ├── verificar-device/index.ts
│       ├── submeter-renda/index.ts
│       ├── aceitar-oferta/index.ts
│       ├── verificar-knox/index.ts
│       └── assinar-contrato/index.ts
├── .env.local.example
└── README.md
```

---

## Banco de Dados Existente

### Tabela `lead` (JÁ EXISTE - NÃO ALTERAR)

```sql
-- Campos relevantes que vamos CONSULTAR:
-- id (PK)
-- cpf (único) - para buscar o cliente
-- telefone - para enviar OTP
-- nome - para validar com Uber
-- "Blacklist" - se true, bloquear acesso
-- fcm_token - para notificações push
```

### Tabela `device_modelo` (JÁ EXISTE - VAMOS ADICIONAR CAMPOS)

```sql
-- Campos que JÁ EXISTEM e vamos usar:
-- id (PK)
-- lead_id (FK)
-- modelo, nome_do_produto, versao_android, fabricante, marca
-- "Aprovado CEL" - flag de device aprovado
-- uber, 99_taxi - flags de validação
-- aprovar_plano - flag de oferta aceita
-- valor_aprovado - valor do empréstimo
-- etapa_garantia - Knox OK
-- etapa - jornada concluída

-- Campos que VAMOS ADICIONAR (executar migration):
-- token (uuid) - identificador único da jornada na URL
-- jornada_step (text) - etapa atual
-- status (text) - in_progress/completed/rejected/expired
-- timestamps de cada etapa
-- dados_uber, dados_99 (jsonb)
-- score_credito, rejection_reason
-- expires_at
```

---

## Fluxo das Páginas

### Página 1: CPF (`/`)

```typescript
// Comportamento:
// 1. Input de CPF com máscara XXX.XXX.XXX-XX
// 2. Validação de dígitos verificadores no frontend
// 3. Ao submeter, chama Edge Function "iniciar-jornada"
// 4. Edge Function:
//    - Busca lead pelo CPF
//    - Verifica Blacklist
//    - Busca ou cria jornada em device_modelo
//    - Gera e envia OTP
// 5. Redireciona para /otp
```

### Página 2: OTP (`/otp`)

```typescript
// Comportamento:
// 1. Input de 6 dígitos com auto-focus
// 2. Timer de 60s para reenvio
// 3. Máximo 3 tentativas
// 4. Ao validar, Edge Function retorna JWT
// 5. Salva JWT no localStorage
// 6. Redireciona para /device
```

### Página 3: Device (`/device`)

```typescript
// Comportamento:
// 1. Coleta info via Client Hints API:
//    navigator.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion'])
// 2. Envia para Edge Function "verificar-device"
// 3. Valida contra tabela eligible_devices
// 4. Se aprovado → /renda
// 5. Se reprovado → Mostra mensagem e encerra
```

### Página 4: Renda (`/renda`)

```typescript
// Comportamento:
// 1. Seleção: Uber ou 99
// 2. Form de login/senha da plataforma
// 3. Submete para Edge Function (enfileira RPA)
// 4. Polling a cada 5s para verificar resultado
// 5. Mostra "Analisando seus ganhos..."
// 6. Quando RPA termina:
//    - Valida nome por similaridade
//    - Executa algoritmo de score
//    - Calcula valor aprovado
// 7. Redireciona para /oferta
```

### Página 5: Oferta (`/oferta`)

```typescript
// Comportamento:
// 1. Mostra: "Parabéns! R$ X em Nx de R$ Y"
// 2. Botão "Aceitar Oferta"
// 3. Ao aceitar, atualiza device_modelo
// 4. Redireciona para /knox
```

### Página 6: Knox (`/knox`)

```typescript
// Comportamento:
// 1. Instruções para acessar guard.samsungknox.com
// 2. Input para IMEI
// 3. Botão "Já fiz o registro"
// 4. Verifica enrollment via API/polling
// 5. Se confirmado → /contrato
```

### Página 7: Contrato (`/contrato`)

```typescript
// Comportamento:
// 1. Gera contrato (processo já existe no backend)
// 2. Mostra PDF embedded
// 3. Checkbox de termos
// 4. Botão "Assinar"
// 5. Ao assinar, atualiza device_modelo
// 6. Redireciona para /sucesso
```

### Página 8: Sucesso (`/sucesso`)

```typescript
// Comportamento:
// 1. "Crédito liberado em até 10 minutos!"
// 2. Próximos passos
// 3. Link para baixar APP (opcional)
```

---

## Edge Functions

### `iniciar-jornada`

```typescript
// Input: { cpf: string }
// Output: { 
//   success: boolean,
//   journey_id: string,
//   phone_last4: string,
//   has_existing: boolean
// }

// Lógica:
// 1. Valida formato CPF
// 2. Busca lead: SELECT * FROM lead WHERE cpf = ?
// 3. Se não encontrar → erro "CPF não cadastrado"
// 4. Se Blacklist = true → erro "Acesso bloqueado"
// 5. Busca jornada ativa: SELECT * FROM device_modelo WHERE lead_id = ? AND status = 'in_progress' AND expires_at > now()
// 6. Se não tem → INSERT device_modelo (cria nova)
// 7. Gera OTP 6 dígitos
// 8. INSERT otp_codes (device_modelo_id, code_hash, expires_at)
// 9. Envia SMS (Twilio)
// 10. INSERT journey_events (event_type: 'otp_sent')
// 11. Retorna dados
```

### `validar-otp`

```typescript
// Input: { journey_id: string, code: string }
// Output: { success: boolean, token: string, current_step: string }

// Lógica:
// 1. Busca OTP válido: SELECT * FROM otp_codes WHERE device_modelo_id = ? AND code_hash = sha256(?) AND NOT used AND expires_at > now()
// 2. Se não encontrar → erro + incrementa attempts
// 3. Marca OTP como usado
// 4. UPDATE device_modelo SET jornada_step = 'device', otp_verified_at = now()
// 5. Gera JWT com { jti: journey_id, step: 'device', exp: 2h }
// 6. INSERT journey_events (event_type: 'otp_verified')
// 7. Retorna token + step atual
```

### `verificar-device`

```typescript
// Input: { journey_id: string, model: string, platform: string, version: string }
// Output: { approved: boolean, reason?: string }

// Lógica:
// 1. Valida JWT
// 2. SELECT EXISTS (SELECT 1 FROM eligible_devices WHERE active = true AND model ~ model_pattern)
// 3. UPDATE device_modelo SET modelo = ?, "Aprovado CEL" = ?, device_checked_at = now(), jornada_step = 'uber' ou 'rejected'
// 4. INSERT journey_events
// 5. Retorna resultado
```

---

## Zustand Store

```typescript
// src/stores/journeyStore.ts

interface JourneyState {
  // Identificadores
  journeyId: string | null;
  token: string | null;
  leadId: number | null;
  
  // Estado da jornada
  currentStep: 'cpf' | 'otp' | 'device' | 'renda' | 'oferta' | 'knox' | 'contrato' | 'sucesso';
  
  // Dados coletados
  phoneLastFour: string | null;
  deviceModel: string | null;
  deviceApproved: boolean | null;
  rendaApproved: boolean | null;
  offerAmount: number | null;
  offerInstallments: number | null;
  
  // Actions
  setJourney: (id: string, token: string, leadId: number) => void;
  setStep: (step: JourneyState['currentStep']) => void;
  setDeviceResult: (model: string, approved: boolean) => void;
  setRendaResult: (approved: boolean, score: number) => void;
  setOffer: (amount: number, installments: number) => void;
  reset: () => void;
}

// Persistir em localStorage com middleware
```

---

## Componentes Chave

### CPFInput

```typescript
// Máscara: XXX.XXX.XXX-XX
// Validação de dígitos verificadores em tempo real
// Mostrar ✓ quando válido
// Bloquear submit se inválido
```

### OTPInput

```typescript
// 6 inputs individuais
// Auto-focus no próximo ao digitar
// Auto-submit quando completo
// Backspace volta para anterior
// Timer de reenvio (60s)
// Contador de tentativas (máx 3)
```

### DeviceCheck

```typescript
// Detecta device automaticamente ao montar
// Mostra animação de "Verificando..."
// Mostra resultado com ícone ✓ ou ✗
// Se reprovado, mostra mensagem clara
```

### ProgressBar

```typescript
// Etapas: CPF → OTP → Device → Renda → Oferta → Knox → Contrato
// Highlight na etapa atual
// Etapas completas com ✓
// Responsivo (horizontal desktop, vertical mobile)
```

---

## Segurança

### JWT

```typescript
// Payload:
{
  jti: string,      // ID da jornada (device_modelo.id)
  lid: number,      // ID do lead
  step: string,     // Etapa atual
  iat: number,      // Issued at
  exp: number       // Expira em 2h
}

// Validar em TODA requisição:
// 1. Assinatura válida
// 2. Não expirou
// 3. Step corresponde à página acessada
```

### Rate Limiting

```typescript
// OTP: máximo 3 envios por telefone por hora
// Requisições: 10 por IP por minuto
// Tentativas OTP: 3 erros = bloqueio 1h
```

---

## Variáveis de Ambiente

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
JWT_SECRET=xxx
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+55xxx
```

---

## Instruções de Execução

```bash
# 1. Criar projeto
npx create-next-app@latest jornada-credito --typescript --tailwind --app --src-dir
cd jornada-credito

# 2. Instalar dependências
npm install @supabase/supabase-js @supabase/ssr zustand jsonwebtoken
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card alert progress

# 3. Configurar Supabase
npx supabase init
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push

# 4. Rodar
npm run dev
```

---

## Critérios de Aceite

- [ ] Usuário inicia jornada apenas com CPF
- [ ] OTP enviado e validado corretamente
- [ ] Device detectado via Client Hints API
- [ ] Device validado contra lista de elegíveis
- [ ] Integração com RPA preparada (mock inicial)
- [ ] Oferta calculada e exibida
- [ ] Fluxo Knox implementado
- [ ] Contrato gerado e assinado
- [ ] Usuário pode sair e voltar continuando de onde parou
- [ ] Analytics de cada etapa funcionando
- [ ] Rate limiting implementado
- [ ] JWT validado em todas as rotas protegidas
- [ ] Mobile-first e responsivo
- [ ] Erros tratados com mensagens claras

---

## Começar Por

1. Primeiro, crie a estrutura de pastas
2. Depois, execute as migrations SQL no Supabase
3. Em seguida, implemente as páginas em ordem: CPF → OTP → Device
4. Por fim, implemente as Edge Functions correspondentes

Vamos começar?
