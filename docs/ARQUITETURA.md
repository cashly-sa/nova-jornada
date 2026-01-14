# ARQUITETURA.md - Decisoes Tecnicas

> **Versao:** 1.2
> **Data:** Dezembro 2024
> **Status:** Aprovado para desenvolvimento

---

## 1. Visao Geral

### 1.1 Problema Atual

O cliente precisa baixar o APP para saber se e elegivel para credito. Isso causa:
- Alta friccao no inicio da jornada
- Baixa conversao (muitos desistem antes de baixar)
- Custo de aquisicao elevado

### 1.2 Solucao Proposta

Jornada 100% web, continua e sem friccao:
- Entrada apenas por CPF (sem download de app)
- Autenticacao via OTP SMS (sem senha)
- Validacoes em tempo real
- Persistencia de estado para retomada

### 1.3 Principios de Design

| Principio | Descricao |
|-----------|-----------|
| **Sem friccao** | Minimo de etapas e inputs possiveis |
| **Mobile-first** | Otimizado para uso em celular |
| **Recuperavel** | Cliente pode sair e voltar sem perder progresso |
| **Seguro** | Autenticacao por OTP, dados criptografados |
| **Rastreavel** | Analytics completo de cada etapa |

---

## 2. Arquitetura de Sistemas

### 2.1 Visao Macro

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
│       │                    │ Zustand │            │ (Supabase)  │          │
│       │                    └─────────┘            └─────────────┘          │
│       │                                                  │                  │
│       │                                                  ▼                  │
│       │                                           ┌─────────────┐          │
│       ▼                                           │  RPA Queue  │          │
│  ┌─────────┐                                      │  (Uber/99)  │          │
│  │   SMS   │◄─────────────────────────────────────│             │          │
│  │ClickSend│                                      └─────────────┘          │
│  └─────────┘                                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Tecnologica

| Camada | Tecnologia | Versao | Justificativa |
|--------|------------|--------|---------------|
| Framework | Next.js | 15.5.9 | App Router, Edge Runtime |
| UI | React | 19.0.0 | Server Components, Hooks |
| Linguagem | TypeScript | 5.7.2 | Type safety |
| Estilizacao | Tailwind CSS | 3.4.17 | Utility-first, mobile-first |
| Estado | Zustand | 5.0.2 | Leve, persistente no localStorage |
| Validacao | Zod | 3.24.1 | Runtime validation |
| Forms | React Hook Form | 7.54.2 | Performance |
| Banco | Supabase PostgreSQL | 2.47.10 | RLS, Realtime |
| Componentes | Radix UI | - | Acessibilidade |
| Icones | Lucide React | 0.468.0 | Consistencia |
| SMS | ClickSend | - | Confiabilidade |

### 2.3 Sistemas Independentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SISTEMAS COMPLETAMENTE SEPARADOS                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SISTEMA 1: MGM (Member Get Member) - JA EXISTE                            │
│  • URL: mgm.cashly.com.br/{lead.token}                                     │
│  • Proposito: Programa de indicacoes                                       │
│  • Campo usado: lead.token, lead.indicado_por                              │
│  • Status: Producao - NAO ALTERAR                                          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  SISTEMA 2: JORNADA DE CREDITO - NOVO                                      │
│  • URL: credito.cashly.com.br                                              │
│  • URL direta: credito.cashly.com.br/j/{device_modelo.token}               │
│  • Proposito: Avaliacao e concessao de credito                             │
│  • Campo usado: device_modelo.token                                        │
│  • Status: Em desenvolvimento                                              │
│                                                                             │
│  ⚠️  Os dois sistemas sao INDEPENDENTES e nao compartilham tokens          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Estrutura de Pastas

```
src/
├── app/                          # App Router (rotas e API)
│   ├── layout.tsx               # Layout raiz (metadata, viewport)
│   ├── page.tsx                 # Home - entrada CPF (Step 00)
│   ├── cadastro/                # Cadastro novo cliente (Step 00b)
│   ├── credito/                 # Jornada de credito
│   │   ├── otp/page.tsx        # Verificacao OTP (Step 01)
│   │   ├── device/page.tsx     # Elegibilidade dispositivo (Step 02)
│   │   ├── renda/page.tsx      # Verificacao renda (Step 03)
│   │   ├── oferta/page.tsx     # Exibicao oferta (Step 04)
│   │   ├── knox/page.tsx       # Samsung Knox (Step 05)
│   │   ├── contrato/page.tsx   # Assinatura contrato (Step 06)
│   │   └── sucesso/page.tsx    # Sucesso (Step 07)
│   ├── admin/devices/           # Painel admin
│   └── api/                     # API Routes (backend)
├── components/                   # Componentes reutilizaveis
├── hooks/                        # Custom hooks
├── lib/                          # Bibliotecas (supabase, sms, cep)
├── store/                        # Estado global (Zustand)
├── types/                        # Tipos TypeScript
├── schemas/                      # Schemas Zod
└── utils/                        # Utilitarios
```

---

## 4. Modelo de Dados

### 4.1 Decisao Arquitetural: Lead vs Jornada

**Problema:** Onde guardar os dados de aprovacao e status da jornada?

**Decisao:** Separar em duas entidades:
- `lead` = Dados cadastrais do cliente (imutavel)
- `device_modelo` = Cada tentativa de credito (historico)

**Justificativa:**
1. Um cliente pode ter multiplas tentativas (trocou de celular, etc)
2. Analytics de dropout precisa rastrear cada jornada individualmente
3. Nao poluir a tabela lead com flags temporarios

### 4.2 Diagrama de Entidades

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODELO DE DADOS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                            LEAD                                      │   │
│  │                     (Dados do Cliente)                               │   │
│  │                     >>> NAO ALTERAR <<<                              │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  id (PK)                                                            │   │
│  │  cpf (unico) ← CHAVE DE BUSCA para iniciar jornada                  │   │
│  │  telefone ← Para enviar OTP                                         │   │
│  │  nome, email                                                        │   │
│  │  Blacklist ← Bloqueia jornada se true                               │   │
│  │  token ← APENAS para MGM (nao usar na jornada)                      │   │
│  └───────────────────────────┬─────────────────────────────────────────┘   │
│                              │                                              │
│                              │ 1:N (um lead, varias jornadas)              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       DEVICE_MODELO                                  │   │
│  │              (Jornada de Credito - Uma por tentativa)                │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  id (PK)                                                            │   │
│  │  token (unico) ← Para URL direta da jornada                         │   │
│  │  lead_id (FK)                                                       │   │
│  │                                                                      │   │
│  │  -- Controle da Jornada --                                          │   │
│  │  jornada_step ('00'|'01'|'02'|'03'|'04'|'05'|'06'|'07')            │   │
│  │  status (pending|in_progress|completed|rejected|expired)            │   │
│  │  expires_at                                                         │   │
│  │                                                                      │   │
│  │  -- Device Info --                                                  │   │
│  │  modelo, fabricante, "Aprovado CEL", valor_aprovado                 │   │
│  │                                                                      │   │
│  │  -- Dados Coletados --                                              │   │
│  │  dados_uber (JSONB), dados_99 (JSONB), plataforma_escolhida         │   │
│  │  score_credito, knox_imei, contrato_id                              │   │
│  │                                                                      │   │
│  │  -- Timestamps --                                                   │   │
│  │  otp_verified_at, device_checked_at, uber_checked_at                │   │
│  │  offer_shown_at, offer_accepted_at, knox_enrolled_at                │   │
│  │  contrato_assinado_at, completed_at                                 │   │
│  └───────────────────────────┬─────────────────────────────────────────┘   │
│                              │                                              │
│         ┌────────────────────┴────────────────────┐                        │
│         ▼                                         ▼                        │
│  ┌─────────────────────┐               ┌─────────────────────┐             │
│  │     OTP_CODES       │               │   JOURNEY_EVENTS    │             │
│  │  (Codigos SMS)      │               │    (Analytics)      │             │
│  ├─────────────────────┤               ├─────────────────────┤             │
│  │  device_modelo_id   │               │  device_modelo_id   │             │
│  │  code_hash          │               │  event_type         │             │
│  │  expires_at         │               │  step_name          │             │
│  │  used, attempts     │               │  metadata (JSONB)   │             │
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

---

## 5. Autenticacao e Seguranca

### 5.1 Estrategia de Autenticacao

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTENTICACAO SEM SENHA                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FLUXO:                                                                    │
│                                                                             │
│  [CPF] ──► [Busca Lead] ──► [Envia OTP] ──► [Valida OTP] ──► [Sessao]     │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  POR QUE OTP E NAO MAGIC LINK?                                             │
│                                                                             │
│  • Publico-alvo: motoristas de app                                         │
│  • Frequentemente usam dados moveis (SMS e mais direto)                    │
│  • Muitos nao usam email regularmente                                      │
│  • SMS e familiar e rapido                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Camadas de Seguranca

| Camada | Implementacao |
|--------|---------------|
| **Rate Limiting** | 10 OTPs/hora/jornada, 3 tentativas por codigo |
| **Validacao CPF** | Algoritmo de digitos verificadores |
| **OTP** | 6 digitos, expira em 20 min, hash SHA-256 |
| **Token** | UUID gerado server-side, expira com jornada (24h) |
| **Headers** | X-Frame-Options: DENY, X-Content-Type-Options: nosniff |
| **Sequencia** | Validacao que nao pode pular etapas (SessionGuard) |

### 5.3 Persistencia de Estado

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
│  │ Zustand store       │              │ Todos os dados      │              │
│  │ (cashly-journey)    │              │ da jornada          │              │
│  └─────────────────────┘              └─────────────────────┘              │
│                                                                             │
│  Funcao: ATALHO                       Funcao: FONTE DA VERDADE             │
│  Pode perder: SIM                     Pode perder: NAO                     │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  SE PERDER O localStorage:                                                 │
│                                                                             │
│  1. Usuario digita CPF novamente                                           │
│  2. Sistema encontra jornada ativa em device_modelo                        │
│  3. Envia novo OTP para confirmar identidade                               │
│  4. Continua EXATAMENTE de onde parou                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Sistema de Recuperacao de Sessao

**Problema Resolvido:** Usuario saia e voltava, sistema sempre pedia OTP novamente.

**Causa Raiz:** O Zustand hidratava do localStorage DEPOIS das paginas verificarem o estado.

**Solucao Implementada:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE RECUPERACAO DE SESSAO                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Usuario abre app                                                          │
│        │                                                                    │
│        ▼                                                                    │
│  ┌─────────────────┐                                                       │
│  │ Aguardar        │ ← useHydration() usa API nativa do Zustand            │
│  │ hidratacao      │                                                       │
│  └────────┬────────┘                                                       │
│           │                                                                 │
│           ▼                                                                 │
│     Tem token?                                                             │
│      /      \                                                              │
│    Nao      Sim                                                            │
│     │        │                                                              │
│     │        ▼                                                              │
│     │   ┌─────────────────┐                                                │
│     │   │ POST /api/      │ ← Valida token no backend                      │
│     │   │ journey/validate│   Verifica: status, expiracao, otp_verified_at │
│     │   └────────┬────────┘                                                │
│     │            │                                                          │
│     │            ▼                                                          │
│     │      Token valido?                                                   │
│     │       /        \                                                     │
│     │     Nao        Sim                                                   │
│     │      │          │                                                     │
│     │      ▼          ▼                                                     │
│     │   Limpar    OTP valido (<20min)?                                     │
│     │   store      /          \                                            │
│     │      │     Nao          Sim                                          │
│     │      │      │            │                                            │
│     ▼      ▼      ▼            ▼                                            │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐           │
│  │  Mostrar CPF    │  │  Ir para OTP │  │ Ir para step atual   │           │
│  │  (nova jornada) │  │  (MANTER     │  │ (continuar jornada)  │           │
│  └─────────────────┘  │  journeyId!) │  └──────────────────────┘           │
│                       └──────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Arquivos do Sistema:**

| Arquivo | Funcao |
|---------|--------|
| `src/app/api/journey/validate/route.ts` | API que valida token e retorna dados |
| `src/hooks/useSessionRecovery.ts` | Hook que aguarda hidratacao e valida |
| `src/components/SessionGuard.tsx` | Wrapper que protege rotas |

### 5.5 Sistema de Idempotencia

**Problema Resolvido:** Usuarios com conexao instavel causavam requisicoes duplicadas.

**Solucoes Implementadas:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PADROES DE IDEMPOTENCIA                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. FUNCAO ATOMICA PostgreSQL (OTP)                                        │
│  ───────────────────────────────────                                        │
│                                                                             │
│  verify_otp_atomic(journey_id, code_hash)                                  │
│  • SELECT ... FOR UPDATE (lock exclusivo)                                  │
│  • Valida codigo e tentativas                                              │
│  • UPDATE otp + UPDATE jornada + INSERT evento                             │
│  • Tudo em uma transacao                                                   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  2. COMPARE-AND-SWAP (Device Validation)                                   │
│  ───────────────────────────────────────                                    │
│                                                                             │
│  // So atualiza se ainda nao foi verificado                                │
│  supabase.update(data)                                                     │
│    .eq('id', journeyId)                                                    │
│    .is('device_checked_at', null)  // ← Condicao CAS                       │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  3. INDICE UNIQUE PARCIAL (OTP)                                            │
│  ──────────────────────────────                                             │
│                                                                             │
│  CREATE UNIQUE INDEX idx_otp_codes_device_unused_unique                    │
│  ON otp_codes(device_modelo_id)                                            │
│  WHERE used = false;                                                        │
│                                                                             │
│  • Garante apenas 1 OTP nao-usado por jornada                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Operacao | Era Idempotente? | Agora | Solucao |
|----------|------------------|-------|---------|
| `/api/otp/verify` | ❌ Race condition | ✅ | Funcao atomica PostgreSQL |
| `/api/device/validate` | ❌ Sobrescrevia | ✅ | Compare-And-Swap |
| OTP duplicados | ❌ Criava multiplos | ✅ | Indice UNIQUE parcial |

---

## 6. Deteccao de Device

### 6.1 Client Hints API

```javascript
if (navigator.userAgentData) {
  const hints = await navigator.userAgentData.getHighEntropyValues([
    "model",           // "SM-S918B"
    "platform",        // "Android"
    "platformVersion"  // "14"
  ]);
}
```

### 6.2 Validacao no Backend

```sql
-- Tabela de devices elegiveis (regex patterns)
SELECT * FROM eligible_devices WHERE active = true;

-- Validacao
SELECT EXISTS (
  SELECT 1 FROM eligible_devices
  WHERE active = true
    AND 'SM-S918B' ~ model_pattern
);
```

---

## 7. Integracao com RPA (Uber/99)

### 7.1 Fluxo Assincrono

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE VALIDACAO UBER/99                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FRONTEND                 BACKEND                   RPA (Python)            │
│                                                                             │
│  [Form credenciais]                                                        │
│        │                                                                    │
│        ▼                                                                    │
│  POST /api/submit-uber ─────────────────────────────────────────────►      │
│        │                     │                                              │
│        │              [Enfileira job]                                       │
│        │                     │                                              │
│  ◄─────┴────────────[Retorna job_id]                                       │
│        │                                                                    │
│  [Mostra "Analisando..."]                          [Worker processa]       │
│        │                                                  │                 │
│  [Polling a cada 5s] ────────────────────────────► [Scraping Uber]         │
│        │                     │                           │                  │
│        │              [Job concluido!]◄──────────────────┘                  │
│        │                     │                                              │
│  ◄─────┴─────────────────────┘                                             │
│        │                                                                    │
│  [Calcula score e valor]                                                   │
│        │                                                                    │
│  [Redireciona para /oferta]                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Integracoes Externas

| Servico | Proposito | Documentacao |
|---------|-----------|--------------|
| Supabase | Banco PostgreSQL | https://supabase.com/docs |
| ClickSend | Envio de SMS (OTP) | https://developers.clicksend.com |
| Palenca | Verificacao de renda | https://docs.palenca.com |
| ViaCEP | Busca de endereco | https://viacep.com.br |
| Samsung Knox | Registro de dispositivo | (interno) |

---

## 9. Analytics de Dropout

### 9.1 Event Sourcing

Cada acao gera um evento na tabela `journey_events`:

```sql
INSERT INTO journey_events (device_modelo_id, event_type, step_name, metadata)
VALUES (123, 'step_started', 'device', '{"model": "SM-S918B"}');
```

### 9.2 Tipos de Eventos

| event_type | Descricao |
|------------|-----------|
| step_started | Usuario entrou na etapa |
| step_completed | Usuario completou a etapa |
| step_failed | Erro ou reprovacao |
| otp_sent | OTP enviado |
| otp_verified | OTP validado |
| session_expired | Sessao expirou |
| session_recovered | Sessao recuperada |

---

## 10. Tratamento de Erros

| Cenario | Resposta |
|---------|----------|
| CPF nao encontrado | "CPF nao cadastrado no sistema" |
| Lead em Blacklist | "Acesso temporariamente indisponivel" |
| OTP expirado | "Codigo expirado. Clique para reenviar" |
| OTP invalido (3x) | Bloqueia por 1h |
| Device nao elegivel | "Seu dispositivo nao e compativel" |
| Jornada expirada (24h) | Inicia nova jornada |

---

## 11. ADRs (Decisoes de Arquitetura)

| Data | Decisao | Justificativa |
|------|---------|---------------|
| Dez/24 | Zustand com localStorage | Performance + UX de retomada |
| Dez/24 | OTP via SMS (nao magic link) | Publico-alvo usa mais SMS |
| Dez/24 | Jornada em device_modelo | Historico de tentativas + analytics |
| Dez/24 | Nao alterar tabela lead | Minimizar impacto em sistemas existentes |
| Dez/24 | Client Hints API | Deteccao de device mais precisa |
| Dez/24 | Funcao atomica PostgreSQL para OTP | Garantir atomicidade no banco |
| Dez/24 | CAS para device validation | Evitar sobrescrita em requisicoes duplicadas |
| Dez/24 | Beacon API para eventos | Entrega garantida mesmo ao fechar pagina |

---

## 12. Performance e Escalabilidade

### Performance
- Cache de CPF: 5 minutos em memoria
- Persistencia seletiva: Apenas dados essenciais no localStorage
- Beacon API: Fire-and-forget para eventos

### Escalabilidade
- Supabase: Auto-scaling PostgreSQL
- Vercel: Serverless functions escalam automaticamente
- Rate limiting: 10 OTPs/hora por jornada
- Indices otimizados: Queries frequentes indexadas

---

## Changelog

| Versao | Data | Alteracoes |
|--------|------|------------|
| 1.0 | Dez/24 | Versao inicial |
| 1.1 | Dez/24 | Sistema de recuperacao de sessao |
| 1.2 | Dez/24 | Sistema de idempotencia |

---

*Ultima atualizacao: 2025-12-22*
