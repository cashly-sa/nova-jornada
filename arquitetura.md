# Arquitetura - Jornada de Crédito Cashly

> **Versão:** 1.0  
> **Data:** Dezembro 2024  
> **Status:** Aprovado para desenvolvimento

---

## 1. Visão Geral

### 1.1 Problema Atual

O cliente precisa baixar o APP para saber se é elegível para crédito. Isso causa:
- Alta fricção no início da jornada
- Baixa conversão (muitos desistem antes de baixar)
- Custo de aquisição elevado

### 1.2 Solução Proposta

Jornada 100% web, contínua e sem fricção:
- Entrada apenas por CPF (sem download de app)
- Autenticação via OTP SMS (sem senha)
- Validações em tempo real
- Persistência de estado para retomada

### 1.3 Princípios de Design

| Princípio | Descrição |
|-----------|-----------|
| **Sem fricção** | Mínimo de etapas e inputs possíveis |
| **Mobile-first** | Otimizado para uso em celular |
| **Recuperável** | Cliente pode sair e voltar sem perder progresso |
| **Seguro** | Autenticação por OTP, dados criptografados |
| **Rastreável** | Analytics completo de cada etapa |

---

## 2. Arquitetura de Sistemas

### 2.1 Visão Macro

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARQUITETURA GERAL                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   CLIENTE                    FRONTEND                 BACKEND               │
│   ───────                    ────────                 ───────               │
│                                                                             │
│  ┌─────────┐              ┌─────────────┐         ┌─────────────┐          │
│  │ Browser │─────────────►│  Next.js    │────────►│  Supabase   │          │
│  │ Mobile  │◄─────────────│  (Vercel)   │◄────────│  Edge Funcs │          │
│  └─────────┘              └─────────────┘         └──────┬──────┘          │
│       │                         │                        │                  │
│       │                         │                        ▼                  │
│       │                    ┌────┴────┐            ┌─────────────┐          │
│       │                    │ Estado  │            │ PostgreSQL  │          │
│       │                    │ (JWT +  │            │ (Supabase)  │          │
│       │                    │ Zustand)│            └─────────────┘          │
│       │                    └─────────┘                   │                  │
│       │                                                  │                  │
│       │                                                  ▼                  │
│       │                                           ┌─────────────┐          │
│       ▼                                           │  RPA Queue  │          │
│  ┌─────────┐                                      │  (Uber/99)  │          │
│  │   SMS   │◄─────────────────────────────────────┤             │          │
│  │ (Twilio)│                                      └─────────────┘          │
│  └─────────┘                                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Frontend** | Next.js 14 (App Router) | SSR, Edge Runtime, React Server Components |
| **UI** | Tailwind + Shadcn/ui | Design system acessível e consistente |
| **Estado Client** | Zustand + JWT | Leve, persistente no localStorage |
| **Backend** | Supabase Edge Functions | Mesmo ecossistema, baixa latência |
| **Database** | Supabase PostgreSQL | RLS, Realtime, já em uso |
| **SMS** | Twilio ou AWS SNS | Confiabilidade e entrega rápida |
| **RPA** | Python (existente) | Código já validado para Uber/99 |

### 2.3 Sistemas Independentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SISTEMAS COMPLETAMENTE SEPARADOS                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SISTEMA 1: MGM (Member Get Member) - JÁ EXISTE                            │
│  ══════════════════════════════════════════════                             │
│  • URL: mgm.cashly.com.br/{lead.token}                                     │
│  • Propósito: Programa de indicações                                       │
│  • Campo usado: lead.token, lead.indicado_por                              │
│  • Status: Produção - NÃO ALTERAR                                          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  SISTEMA 2: JORNADA DE CRÉDITO - NOVO                                      │
│  ════════════════════════════════════                                       │
│  • URL: credito.cashly.com.br                                              │
│  • URL direta: credito.cashly.com.br/j/{device_modelo.token}               │
│  • Propósito: Avaliação e concessão de crédito                             │
│  • Campo usado: device_modelo.token                                        │
│  • Status: Em desenvolvimento                                              │
│                                                                             │
│  ⚠️  Os dois sistemas são INDEPENDENTES e não compartilham tokens          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Modelo de Dados

### 3.1 Decisão Arquitetural: Lead vs Jornada

**Problema:** Onde guardar os dados de aprovação e status da jornada?

**Decisão:** Separar em duas entidades:
- `lead` = Dados cadastrais do cliente (imutável)
- `device_modelo` = Cada tentativa de crédito (histórico)

**Justificativa:**
1. Um cliente pode ter múltiplas tentativas (trocou de celular, etc)
2. Analytics de dropout precisa rastrear cada jornada individualmente
3. Não poluir a tabela lead com flags temporários

### 3.2 Diagrama de Entidades

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODELO DE DADOS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                            LEAD                                      │   │
│  │                     (Dados do Cliente)                               │   │
│  │                     >>> NÃO ALTERAR <<<                              │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  id (PK)                                                            │   │
│  │  cpf (único) ← CHAVE DE BUSCA para iniciar jornada                  │   │
│  │  telefone ← Para enviar OTP                                         │   │
│  │  nome, email                                                        │   │
│  │  Blacklist ← Bloqueia jornada se true                               │   │
│  │  fcm_token ← Para notificações push                                 │   │
│  │  token ← APENAS para MGM (não usar na jornada)                      │   │
│  │  indicado_por ← APENAS para MGM                                     │   │
│  └───────────────────────────┬─────────────────────────────────────────┘   │
│                              │                                              │
│                              │ 1:N (um lead, várias jornadas)              │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       DEVICE_MODELO                                  │   │
│  │              (Jornada de Crédito - Uma por tentativa)                │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  id (PK)                                                            │   │
│  │  token (único) ← Para URL direta da jornada                         │   │
│  │  lead_id (FK)                                                       │   │
│  │                                                                      │   │
│  │  -- Controle da Jornada --                                          │   │
│  │  jornada_step (inicio/otp/device/uber/offer/knox/contract/done)     │   │
│  │  status (in_progress/completed/rejected/expired)                    │   │
│  │  expires_at                                                         │   │
│  │                                                                      │   │
│  │  -- Device Info --                                                  │   │
│  │  modelo, nome_do_produto, versao_android, fabricante, marca         │   │
│  │                                                                      │   │
│  │  -- Aprovações (campos já existentes) --                            │   │
│  │  "Aprovado CEL", uber, 99_taxi, aprovar_plano, etapa_garantia       │   │
│  │                                                                      │   │
│  │  -- Dados Coletados --                                              │   │
│  │  dados_uber (JSONB), dados_99 (JSONB), score_credito                │   │
│  │  valor_aprovado, knox_imei, contrato_id                             │   │
│  │                                                                      │   │
│  │  -- Timestamps --                                                   │   │
│  │  created_at, otp_verified_at, device_checked_at, uber_checked_at    │   │
│  │  offer_accepted_at, knox_enrolled_at, contract_signed_at            │   │
│  └───────────────────────────┬─────────────────────────────────────────┘   │
│                              │                                              │
│         ┌────────────────────┴────────────────────┐                        │
│         │                                         │                        │
│         ▼                                         ▼                        │
│  ┌─────────────────────┐               ┌─────────────────────┐             │
│  │     OTP_CODES       │               │   JOURNEY_EVENTS    │             │
│  │  (Códigos SMS)      │               │    (Analytics)      │             │
│  ├─────────────────────┤               ├─────────────────────┤             │
│  │  device_modelo_id   │               │  device_modelo_id   │             │
│  │  code_hash          │               │  event_type         │             │
│  │  expires_at         │               │  step_name          │             │
│  │  used               │               │  metadata (JSONB)   │             │
│  └─────────────────────┘               └─────────────────────┘             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     ELIGIBLE_DEVICES                                 │   │
│  │                (Lista de Devices Aceitos)                            │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  brand, model_pattern (regex), min_year, description, active        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Campos Existentes Aproveitados

| Tabela | Campo | Uso na Jornada |
|--------|-------|----------------|
| lead | cpf | Busca do cliente na entrada |
| lead | telefone | Envio de OTP |
| lead | Blacklist | Bloqueio de acesso |
| lead | fcm_token | Notificações push |
| device_modelo | modelo | Modelo técnico do device |
| device_modelo | "Aprovado CEL" | Flag de device aprovado |
| device_modelo | uber | Flag de Uber validado |
| device_modelo | 99_taxi | Flag de 99 validado |
| device_modelo | aprovar_plano | Flag de oferta aceita |
| device_modelo | valor_aprovado | Valor do empréstimo |
| device_modelo | etapa_garantia | Flag de Knox OK |
| device_modelo | etapa | Jornada concluída |

---

## 4. Autenticação e Segurança

### 4.1 Estratégia de Autenticação

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTENTICAÇÃO SEM SENHA                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FLUXO:                                                                    │
│                                                                             │
│  [CPF] ──► [Busca Lead] ──► [Envia OTP] ──► [Valida OTP] ──► [Gera JWT]   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  POR QUE OTP E NÃO MAGIC LINK?                                             │
│                                                                             │
│  • Público-alvo: motoristas de app                                         │
│  • Frequentemente usam dados móveis (SMS é mais direto)                    │
│  • Muitos não usam email regularmente                                      │
│  • SMS é familiar e rápido                                                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  ESTRUTURA DO JWT:                                                         │
│                                                                             │
│  {                                                                          │
│    "jti": "uuid-da-jornada",        // ID do device_modelo                 │
│    "lid": 123,                       // ID do lead                          │
│    "step": "device",                 // Etapa atual                         │
│    "iat": 1703001600,                // Criado em                           │
│    "exp": 1703008800                 // Expira em 2h                        │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Camadas de Segurança

| Camada | Implementação |
|--------|---------------|
| **Rate Limiting** | 3 tentativas OTP/telefone/hora, 10 req/IP/minuto |
| **Validação CPF** | Algoritmo de dígitos verificadores |
| **OTP** | 6 dígitos, expira em 5 min, máximo 3 reenvios |
| **JWT** | Assinado com chave rotacionada, fingerprint do device |
| **Dados Sensíveis** | CPF nunca salvo em log, dados Uber/99 criptografados |
| **Sequência** | Validação que não pode pular etapas |

### 4.3 Persistência de Estado

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ONDE OS DADOS FICAM                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📱 NAVEGADOR DO CLIENTE              ☁️  SUPABASE (Servidor)               │
│  ─────────────────────────            ────────────────────────              │
│                                                                             │
│  localStorage:                        Tabela device_modelo:                 │
│  ┌─────────────────────┐              ┌─────────────────────┐              │
│  │ token JWT           │              │ Todos os dados      │              │
│  │ (válido por 2h)     │              │ da jornada          │              │
│  └─────────────────────┘              └─────────────────────┘              │
│                                                                             │
│  Função: ATALHO                       Função: FONTE DA VERDADE             │
│  Pode perder: SIM                     Pode perder: NÃO                     │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  SE PERDER O localStorage:                                                 │
│                                                                             │
│  1. Usuário digita CPF novamente                                           │
│  2. Sistema encontra jornada ativa em device_modelo                        │
│  3. Envia novo OTP para confirmar identidade                               │
│  4. Gera novo JWT                                                          │
│  5. Continua EXATAMENTE de onde parou                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Sistema de Recuperação de Sessão (Implementado)

**Problema Resolvido:** Usuário saia e voltava, sistema sempre pedia OTP novamente.

**Causa Raiz:** O Zustand hidratava do localStorage DEPOIS das páginas verificarem o estado, causando redirecionamento incorreto.

**Solução Implementada:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE RECUPERAÇÃO DE SESSÃO                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Usuário abre app                                                          │
│        │                                                                    │
│        ▼                                                                    │
│  ┌─────────────────┐                                                       │
│  │ Aguardar        │ ← useHydration() usa API nativa do Zustand            │
│  │ hidratação      │   persist.onFinishHydration()                         │
│  └────────┬────────┘                                                       │
│           │                                                                 │
│           ▼                                                                 │
│     Tem token?                                                             │
│      /      \                                                              │
│    Não      Sim                                                            │
│     │        │                                                              │
│     │        ▼                                                              │
│     │   ┌─────────────────┐                                                │
│     │   │ POST /api/      │ ← Valida token no backend                      │
│     │   │ journey/validate│   Verifica: status, expiração, otp_verified_at │
│     │   └────────┬────────┘                                                │
│     │            │                                                          │
│     │            ▼                                                          │
│     │      Token válido?                                                   │
│     │       /        \                                                     │
│     │     Não        Sim                                                   │
│     │      │          │                                                     │
│     │      ▼          ▼                                                     │
│     │   Limpar    OTP válido (<20min)?                                     │
│     │   store      /          \                                            │
│     │      │     Não          Sim                                          │
│     │      │      │            │                                            │
│     ▼      ▼      ▼            ▼                                            │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐           │
│  │  Mostrar CPF    │  │  Ir para OTP │  │ Ir para step atual   │           │
│  │  (nova jornada) │  │  (MANTER     │  │ (continuar jornada)  │           │
│  └─────────────────┘  │  journeyId!) │  └──────────────────────┘           │
│                       └──────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Arquivos Criados:**

| Arquivo | Função |
|---------|--------|
| `src/app/api/journey/validate/route.ts` | API que valida token e retorna dados da jornada |
| `src/hooks/useSessionRecovery.ts` | Hook que aguarda hidratação e valida sessão |
| `src/components/SessionGuard.tsx` | Componente wrapper que protege rotas |

**Arquivos Modificados:**

| Arquivo | Alteração |
|---------|-----------|
| `src/store/journey.store.ts` | Hook useHydration melhorado + campo `otpVerifiedAt` + mais campos persistidos |
| `src/types/journey.types.ts` | Helpers `getRouteForStep()` e `canAccessStep()` |
| Todas as páginas `/credito/*` | Usam `SessionGuard` para proteção |

**Campos Persistidos no localStorage (chave: `cashly-journey`):**

```typescript
{
  cpf, leadId, leadData,           // Dados do usuário
  journeyId, token,                // Identificação da jornada
  currentStep, otpVerified,        // Estado atual
  otpVerifiedAt,                   // Timestamp para validar expiração OTP
  deviceInfo, valorAprovado,       // Dados coletados
  rendaInfo, knoxImei, contratoId  // Progresso da jornada
}
```

**Decisões Importantes:**

| Decisão | Justificativa |
|---------|---------------|
| OTP expira em 20 minutos | Segurança vs. UX - tempo suficiente para completar jornada |
| OTP expirado mantém journeyId | Não criar nova jornada, apenas revalidar identidade |
| Validação no backend | Nunca confiar apenas no estado do frontend |
| Spinner durante verificação | Evita flash de tela de CPF antes de redirecionar |

---

## 5. Detecção de Device

### 5.1 Client Hints API

```javascript
// Coleta de informações do device no frontend
if (navigator.userAgentData) {
  const hints = await navigator.userAgentData.getHighEntropyValues([
    "model",           // "SM-S918B"
    "platform",        // "Android"
    "platformVersion", // "14"
    "architecture"     // "arm64"
  ]);
  
  // Envia apenas o necessário para o backend
  await fetch('/api/check-device', {
    method: 'POST',
    body: JSON.stringify({
      model: hints.model,
      platform: hints.platform,
      version: hints.platformVersion
    })
  });
}
```

### 5.2 Validação no Backend

```sql
-- Tabela de devices elegíveis (regex patterns)
SELECT * FROM eligible_devices WHERE active = true;

-- brand      | model_pattern      | description
-- Samsung    | ^SM-S9[0-9]{2}     | Galaxy S21/S22/S23/S24
-- Samsung    | ^SM-A[5-7][0-9]    | Galaxy A50-A70 (2022+)

-- Validação
SELECT EXISTS (
  SELECT 1 FROM eligible_devices
  WHERE active = true
    AND 'SM-S918B' ~ model_pattern
);
```

### 5.3 Por Que Não Gravar Tudo?

**Decisão:** Gravar apenas modelo + resultado (aprovado/reprovado)

**Justificativa:**
- User Agent completo é muito verboso e muda frequentemente
- Informações detalhadas do device não são necessárias para decisão
- Menos dados = melhor performance e menor custo
- Compliance com LGPD (minimização de dados)

---

## 6. Integração com RPA (Uber/99)

### 6.1 Fluxo Assíncrono

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE VALIDAÇÃO UBER/99                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FRONTEND                 BACKEND                   RPA (Python)            │
│  ────────                 ───────                   ────────────            │
│                                                                             │
│  [Form login/senha]                                                        │
│        │                                                                    │
│        ▼                                                                    │
│  POST /api/submit-uber ──────────────────────────────────────────────►     │
│        │                     │                                              │
│        │              [Enfileira job]                                       │
│        │                     │                                              │
│        │                     ▼                                              │
│        │              [Retorna job_id]                                      │
│        │                     │                                              │
│  ◄─────┴─────────────────────┘                                             │
│        │                                                                    │
│  [Mostra "Analisando..."]                          [Worker processa]       │
│        │                                                  │                 │
│        │                                                  ▼                 │
│  [Polling a cada 5s] ────────────────────────────► [Scraping Uber]         │
│        │                     │                           │                  │
│        │              [Verifica status]                  │                  │
│        │                     │                           ▼                  │
│        │                     │                    [Salva resultado]         │
│        │                     │                           │                  │
│        │              [Job concluído!]◄──────────────────┘                  │
│        │                     │                                              │
│  ◄─────┴─────────────────────┘                                             │
│        │                                                                    │
│  [Processa resultado]                                                      │
│  - Valida nome (similaridade)                                              │
│  - Executa algoritmo de score                                              │
│  - Calcula valor aprovado                                                  │
│        │                                                                    │
│        ▼                                                                    │
│  [Redireciona para /offer]                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Validações

| Validação | Método | Critério |
|-----------|--------|----------|
| Nome | Levenshtein Distance | > 0.8 de similaridade |
| Score | Algoritmo Python | Ganhos semanais + comportamento |
| Valor | Regra de negócio | Baseado no score |

---

## 7. Analytics de Dropout

### 7.1 Event Sourcing

Cada ação gera um evento na tabela `journey_events`:

```sql
INSERT INTO journey_events (device_modelo_id, event_type, step_name, metadata)
VALUES (123, 'step_started', 'device', '{"model": "SM-S918B"}');
```

### 7.2 Tipos de Eventos

| event_type | Descrição |
|------------|-----------|
| step_started | Usuário entrou na etapa |
| step_completed | Usuário completou a etapa |
| step_failed | Erro ou reprovação |
| otp_sent | OTP enviado |
| otp_verified | OTP validado |
| otp_failed | OTP inválido |
| session_expired | Sessão expirou |
| session_recovered | Sessão recuperada |

### 7.3 Views de Analytics

```sql
-- Funil por etapa
SELECT * FROM v_journey_funnel;

-- jornada_step | total | completed | rejected | completion_rate
-- otp          | 1000  | 950       | 50       | 95.00
-- device       | 950   | 800       | 150      | 84.21
-- uber         | 800   | 600       | 200      | 75.00
-- offer        | 600   | 550       | 50       | 91.67
-- knox         | 550   | 500       | 50       | 90.91
-- contract     | 500   | 480       | 20       | 96.00
```

---

## 8. Tratamento de Erros e Edge Cases

### 8.1 Cenários e Respostas

| Cenário | Resposta |
|---------|----------|
| CPF não encontrado | "CPF não cadastrado no sistema" |
| Lead em Blacklist | "Acesso temporariamente indisponível" |
| OTP expirado | "Código expirado. Clique para reenviar" |
| OTP inválido (3x) | Bloqueia por 1h |
| Device não elegível | "Seu dispositivo não é compatível" |
| Jornada expirada (24h) | Inicia nova jornada |
| Erro no RPA | "Não conseguimos validar. Tente novamente" |
| Knox não confirmado | Permite 3 tentativas de verificação |

### 8.2 Timeout e Retry

| Operação | Timeout | Retry |
|----------|---------|-------|
| Busca de lead | 5s | 2x |
| Envio de OTP | 10s | 3x |
| Check device | 5s | 2x |
| RPA Uber/99 | 60s | 1x |
| Knox verification | 10s | 3x |

---

## 9. Roadmap de Implementação

### Fase 1: MVP (2 semanas)
- [ ] Estrutura Next.js + Supabase
- [ ] Tela de CPF + OTP
- [ ] Validação de device
- [ ] Integração básica Uber/99

### Fase 2: Core (2 semanas)
- [ ] Algoritmo de score
- [ ] Geração de oferta
- [ ] Integração Knox
- [ ] Geração de contrato

### Fase 3: Polish (1 semana)
- [ ] Analytics completo
- [ ] Notificações push
- [ ] Otimizações de UX
- [ ] Testes de carga

---

## 10. Decisões Técnicas Registradas

| Data | Decisão | Justificativa |
|------|---------|---------------|
| Dez/24 | JWT em localStorage | Performance + UX de retomada |
| Dez/24 | OTP via SMS (não magic link) | Público-alvo usa mais SMS |
| Dez/24 | Jornada em device_modelo | Histórico de tentativas + analytics |
| Dez/24 | Não alterar tabela lead | Minimizar impacto em sistemas existentes |
| Dez/24 | Client Hints API | Detecção de device mais precisa |
| Dez/24 | Polling para RPA | Simplicidade vs WebSocket |

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | Dez/24 | Versão inicial |
| 1.1 | Dez/24 | Implementação do sistema de recuperação de sessão (seção 4.4) |
