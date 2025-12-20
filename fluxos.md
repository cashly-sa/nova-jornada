# Fluxos Detalhados - Jornada de Crédito Cashly

> **Versão:** 1.0  
> **Data:** Dezembro 2024

---

## 1. Fluxo Geral da Jornada

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VISÃO GERAL DA JORNADA                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────┐    ┌─────┐    ┌────────┐    ┌───────┐    ┌───────┐              │
│   │ CPF │───►│ OTP │───►│ DEVICE │───►│ RENDA │───►│OFERTA │              │
│   └─────┘    └─────┘    └────────┘    └───────┘    └───────┘              │
│                              │              │           │                   │
│                              ▼              ▼           ▼                   │
│                         [Reprova]      [Reprova]   [Aceita]                │
│                              │              │           │                   │
│                              ▼              ▼           │                   │
│                           [FIM]          [FIM]         │                   │
│                                                         │                   │
│                                                         ▼                   │
│                                                    ┌───────┐               │
│                                                    │ KNOX  │               │
│                                                    └───────┘               │
│                                                         │                   │
│                                                         ▼                   │
│                                                   ┌──────────┐             │
│                                                   │CONTRATO  │             │
│                                                   └──────────┘             │
│                                                         │                   │
│                                                         ▼                   │
│                                                    ┌─────────┐             │
│                                                    │ SUCESSO │             │
│                                                    └─────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Fluxo de Entrada (CPF)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE ENTRADA                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USUÁRIO                       FRONTEND                    BACKEND          │
│  ───────                       ────────                    ───────          │
│                                                                             │
│  Acessa URL                                                                │
│  credito.cashly.com.br                                                     │
│       │                                                                     │
│       ▼                                                                     │
│  [Tela de CPF]◄───────────────┐                                            │
│       │                       │                                             │
│       │ Digita CPF            │                                             │
│       ▼                       │                                             │
│  [Validação frontend]         │                                             │
│       │                       │                                             │
│       ├── CPF inválido ───────┘ "CPF inválido"                             │
│       │                                                                     │
│       ▼                                                                     │
│  POST /api/iniciar-jornada ─────────────────────────────────►              │
│       │                                              │                      │
│       │                                              ▼                      │
│       │                                  ┌─────────────────────┐           │
│       │                                  │ SELECT * FROM lead  │           │
│       │                                  │ WHERE cpf = ?       │           │
│       │                                  └──────────┬──────────┘           │
│       │                                             │                       │
│       │                           ┌─────────────────┼─────────────────┐    │
│       │                           │                 │                 │    │
│       │                           ▼                 ▼                 ▼    │
│       │                     [Não encontrou]  [Blacklist=true]   [OK!]     │
│       │                           │                 │                 │    │
│       │                           ▼                 ▼                 │    │
│       │                     Return erro       Return erro            │    │
│       │                           │                 │                 │    │
│       │◄──────────────────────────┴─────────────────┘                 │    │
│       │                                                               │    │
│       ▼                                                               ▼    │
│  [Mostra erro]                              ┌─────────────────────────────┐│
│                                             │ get_or_create_journey()     ││
│                                             │ - Busca jornada ativa       ││
│                                             │ - Se não tem, cria nova     ││
│                                             └──────────────┬──────────────┘│
│                                                            │               │
│                                                            ▼               │
│                                             ┌─────────────────────────────┐│
│                                             │ Gera OTP 6 dígitos          ││
│                                             │ INSERT otp_codes            ││
│                                             │ Envia SMS                   ││
│                                             └──────────────┬──────────────┘│
│                                                            │               │
│       │◄───────────────────────────────────────────────────┘               │
│       │  { journey_id, phone_last4, has_existing }                         │
│       │                                                                     │
│       ▼                                                                     │
│  router.push('/otp')                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Fluxo de Validação OTP

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE VALIDAÇÃO OTP                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USUÁRIO                       FRONTEND                    BACKEND          │
│  ───────                       ────────                    ───────          │
│                                                                             │
│  [Tela de OTP]                                                             │
│       │                                                                     │
│       │ Mostra: "Código enviado para ****7766"                             │
│       │ Mostra: Timer de 60s                                               │
│       │                                                                     │
│       │ Digita 6 dígitos                                                   │
│       ▼                                                                     │
│  [Auto-submit quando completo]                                             │
│       │                                                                     │
│       ▼                                                                     │
│  POST /api/validar-otp ─────────────────────────────────────►              │
│       │                                              │                      │
│       │                                              ▼                      │
│       │                                  ┌─────────────────────┐           │
│       │                                  │ SELECT * FROM       │           │
│       │                                  │ otp_codes WHERE     │           │
│       │                                  │ device_modelo_id=?  │           │
│       │                                  │ AND code_hash=?     │           │
│       │                                  │ AND NOT used        │           │
│       │                                  │ AND expires_at>now()│           │
│       │                                  └──────────┬──────────┘           │
│       │                                             │                       │
│       │                                ┌────────────┴────────────┐         │
│       │                                │                         │         │
│       │                                ▼                         ▼         │
│       │                          [Não encontrou]              [OK!]       │
│       │                                │                         │         │
│       │                                ▼                         ▼         │
│       │                          Incrementa attempts    Marca usado       │
│       │                                │                         │         │
│       │                                │                         ▼         │
│       │                                │              UPDATE device_modelo │
│       │                                │              SET jornada_step =  │
│       │                                │                  'device'        │
│       │                                │                         │         │
│       │                                │                         ▼         │
│       │                                │              Gera JWT {          │
│       │                                │                jti: journey_id,  │
│       │                                │                step: 'device',   │
│       │                                │                exp: 2h           │
│       │                                │              }                    │
│       │                                │                         │         │
│       │◄───────────────────────────────┴─────────────────────────┘         │
│       │                                                                     │
│       │  Erro                          │  Sucesso                          │
│       ▼                                ▼                                    │
│  [Mostra erro]                  localStorage.set(token)                    │
│  [Permite retry]                router.push('/device')                     │
│       │                                                                     │
│       │ Após 3 erros                                                       │
│       ▼                                                                     │
│  [Bloqueia 1h]                                                             │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  REENVIO DE OTP:                                                           │
│                                                                             │
│  [Timer chegou a 0]                                                        │
│       │                                                                     │
│       ▼                                                                     │
│  [Botão "Reenviar" habilitado]                                             │
│       │                                                                     │
│       │ Click                                                              │
│       ▼                                                                     │
│  POST /api/reenviar-otp ───────────────────────────────────────►           │
│       │                                                                     │
│       │  (máximo 3 reenvios por sessão)                                    │
│       │                                                                     │
│       ▼                                                                     │
│  [Reinicia timer 60s]                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Fluxo de Verificação de Device

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FLUXO DE VERIFICAÇÃO DE DEVICE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USUÁRIO                       FRONTEND                    BACKEND          │
│  ───────                       ────────                    ───────          │
│                                                                             │
│  [Tela de Device]                                                          │
│       │                                                                     │
│       │ Mostra: "Verificando seu dispositivo..."                           │
│       │                                                                     │
│       ▼                                                                     │
│  [useEffect: detectar device]                                              │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────┐                                   │
│  │ navigator.userAgentData             │                                   │
│  │   .getHighEntropyValues([           │                                   │
│  │     'model',                        │                                   │
│  │     'platform',                     │                                   │
│  │     'platformVersion'               │                                   │
│  │   ])                                │                                   │
│  └──────────────┬──────────────────────┘                                   │
│                 │                                                           │
│                 │  { model: "SM-S918B", platform: "Android", version: "14" }│
│                 │                                                           │
│                 ▼                                                           │
│  POST /api/verificar-device ────────────────────────────────►              │
│       │                                              │                      │
│       │                                              ▼                      │
│       │                                  ┌─────────────────────┐           │
│       │                                  │ Valida JWT          │           │
│       │                                  │ Verifica step =     │           │
│       │                                  │   'device'          │           │
│       │                                  └──────────┬──────────┘           │
│       │                                             │                       │
│       │                                             ▼                       │
│       │                                  ┌─────────────────────┐           │
│       │                                  │ SELECT EXISTS FROM  │           │
│       │                                  │ eligible_devices    │           │
│       │                                  │ WHERE active=true   │           │
│       │                                  │ AND model ~         │           │
│       │                                  │   model_pattern     │           │
│       │                                  └──────────┬──────────┘           │
│       │                                             │                       │
│       │                                ┌────────────┴────────────┐         │
│       │                                │                         │         │
│       │                                ▼                         ▼         │
│       │                          [Não elegível]            [Elegível]     │
│       │                                │                         │         │
│       │                                ▼                         ▼         │
│       │                          UPDATE device_modelo      UPDATE ...     │
│       │                          SET "Aprovado CEL"=false  SET "Aprovado  │
│       │                              jornada_step=             CEL"=true  │
│       │                                'rejected'            jornada_step=│
│       │                              status='rejected'          'uber'    │
│       │                              rejection_reason=              │     │
│       │                                'device_not_eligible'        │     │
│       │                                │                            │     │
│       │◄───────────────────────────────┴────────────────────────────┘     │
│       │                                                                     │
│       │  { approved: false }           │  { approved: true }               │
│       ▼                                ▼                                    │
│  [Mostra mensagem]              [Mostra ✓]                                 │
│  "Dispositivo não               "Dispositivo aprovado!"                    │
│   compatível"                          │                                    │
│       │                                │                                    │
│       ▼                                ▼                                    │
│  [FIM DA JORNADA]              router.push('/renda')                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Fluxo de Validação de Renda (Uber/99)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FLUXO DE VALIDAÇÃO DE RENDA                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USUÁRIO                FRONTEND                BACKEND              RPA    │
│  ───────                ────────                ───────              ───    │
│                                                                             │
│  [Tela de Renda]                                                           │
│       │                                                                     │
│       │ Seleciona: Uber ou 99                                              │
│       │ Digita: login e senha                                              │
│       │                                                                     │
│       │ Click "Validar"                                                    │
│       ▼                                                                     │
│  POST /api/submeter-renda ─────────────────────────────────►               │
│       │                                              │                      │
│       │                                              ▼                      │
│       │                                  ┌─────────────────────┐           │
│       │                                  │ Valida JWT          │           │
│       │                                  │ Enfileira job RPA   │           │
│       │                                  │ Retorna job_id      │           │
│       │                                  └──────────┬──────────┘           │
│       │                                             │                       │
│       │◄────────────────────────────────────────────┘                      │
│       │  { job_id, status: 'processing' }                                  │
│       │                                                                     │
│       ▼                                                                     │
│  [Mostra "Analisando seus ganhos..."]                      ┌──────────────┐│
│       │                                                    │Worker Python ││
│       │                                                    │processa job  ││
│       │                                                    └──────┬───────┘│
│       │                                                           │        │
│       │  [Polling a cada 5s]                                      │        │
│       │       │                                                   │        │
│       │       ▼                                                   │        │
│  GET /api/status-renda/{job_id} ─────────────────────►           │        │
│       │                                      │                    │        │
│       │                                      ▼                    │        │
│       │                          ┌─────────────────────┐         │        │
│       │                          │ Verifica status job │◄────────┘        │
│       │                          └──────────┬──────────┘                   │
│       │                                     │                              │
│       │                          ┌──────────┴──────────┐                   │
│       │                          │                     │                   │
│       │                          ▼                     ▼                   │
│       │                    [processing]           [completed]              │
│       │                          │                     │                   │
│       │◄─────────────────────────┘                     │                   │
│       │  { status: 'processing' }                      │                   │
│       │                                                │                   │
│       │  [Continua polling...]                         │                   │
│       │                                                │                   │
│       │                                                ▼                   │
│       │                                    ┌─────────────────────┐         │
│       │                                    │ Valida nome         │         │
│       │                                    │ (Levenshtein > 0.8) │         │
│       │                                    │                     │         │
│       │                                    │ Executa algoritmo   │         │
│       │                                    │ de score            │         │
│       │                                    │                     │         │
│       │                                    │ Calcula valor       │         │
│       │                                    │ aprovado            │         │
│       │                                    └──────────┬──────────┘         │
│       │                                               │                    │
│       │                                    ┌──────────┴──────────┐         │
│       │                                    │                     │         │
│       │                                    ▼                     ▼         │
│       │                              [Reprovado]           [Aprovado]     │
│       │                                    │                     │         │
│       │                                    ▼                     ▼         │
│       │                              UPDATE device_modelo              │  │
│       │                              SET uber=false,                   │  │
│       │                                  jornada_step='rejected',      │  │
│       │                                  rejection_reason='...'        │  │
│       │                                    │                           │  │
│       │                                    │     UPDATE device_modelo  │  │
│       │                                    │     SET uber=true,        │  │
│       │                                    │         dados_uber={...}, │  │
│       │                                    │         score_credito=X,  │  │
│       │                                    │         valor_aprovado=Y, │  │
│       │                                    │         jornada_step=     │  │
│       │                                    │           'offer'         │  │
│       │                                    │                     │     │  │
│       │◄───────────────────────────────────┴─────────────────────┘     │  │
│       │                                                                    │
│       │  { approved: false }           │  { approved: true,               │
│       │                                │    score: 750,                   │
│       │                                │    valor: 1500 }                 │
│       ▼                                ▼                                   │
│  [Mostra mensagem]              router.push('/oferta')                    │
│  [FIM DA JORNADA]                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Fluxo de Recuperação de Sessão

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FLUXO DE RECUPERAÇÃO DE SESSÃO                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CENÁRIO: Usuário saiu e voltou depois                                     │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  CASO 1: Volta no mesmo navegador (tem localStorage)                       │
│                                                                             │
│  Acessa URL                                                                │
│       │                                                                     │
│       ▼                                                                     │
│  [Verifica localStorage]                                                   │
│       │                                                                     │
│       │  token = localStorage.get('credit-journey')                        │
│       │                                                                     │
│       ├── Token existe                                                     │
│       │       │                                                            │
│       │       ▼                                                            │
│       │  [Valida JWT]                                                      │
│       │       │                                                            │
│       │       ├── JWT válido e não expirou                                 │
│       │       │       │                                                    │
│       │       │       ▼                                                    │
│       │       │  GET /api/journey/{journey_id} ──────────────►            │
│       │       │       │                               │                    │
│       │       │       │                   Retorna estado atual             │
│       │       │       │◄──────────────────────────────┘                    │
│       │       │       │                                                    │
│       │       │       ▼                                                    │
│       │       │  router.push('/{current_step}')                           │
│       │       │  (Continua de onde parou!)                                │
│       │       │                                                            │
│       │       └── JWT expirou                                              │
│       │               │                                                    │
│       │               ▼                                                    │
│       │          [Remove do localStorage]                                  │
│       │               │                                                    │
│       │               ▼                                                    │
│       │          [Mostra tela de CPF]                                      │
│       │                                                                    │
│       └── Token não existe                                                 │
│               │                                                            │
│               ▼                                                            │
│          [Mostra tela de CPF]                                              │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  CASO 2: Volta em outro navegador (não tem localStorage)                   │
│                                                                             │
│  Acessa URL                                                                │
│       │                                                                     │
│       ▼                                                                     │
│  [Verifica localStorage]                                                   │
│       │                                                                     │
│       │  token = null                                                      │
│       │                                                                     │
│       ▼                                                                     │
│  [Mostra tela de CPF]                                                      │
│       │                                                                     │
│       │  Digita CPF                                                        │
│       ▼                                                                     │
│  POST /api/iniciar-jornada ─────────────────────────────────►              │
│       │                                              │                      │
│       │                                              ▼                      │
│       │                                  ┌─────────────────────┐           │
│       │                                  │ Busca lead          │           │
│       │                                  │ Busca jornada ativa │           │
│       │                                  │   WHERE lead_id = ? │           │
│       │                                  │   AND status =      │           │
│       │                                  │     'in_progress'   │           │
│       │                                  │   AND expires_at >  │           │
│       │                                  │     now()           │           │
│       │                                  └──────────┬──────────┘           │
│       │                                             │                       │
│       │                                             ▼                       │
│       │                                  ┌─────────────────────┐           │
│       │                                  │ ENCONTROU!          │           │
│       │                                  │ Jornada existente   │           │
│       │                                  │ na etapa 'uber'     │           │
│       │                                  └──────────┬──────────┘           │
│       │                                             │                       │
│       │                                             ▼                       │
│       │                                  [Envia OTP para confirmar]        │
│       │                                             │                       │
│       │◄────────────────────────────────────────────┘                      │
│       │  { has_existing: true, current_step: 'uber' }                      │
│       │                                                                     │
│       ▼                                                                     │
│  [Mostra: "Você tem uma solicitação em andamento"]                         │
│  [Tela de OTP]                                                             │
│       │                                                                     │
│       │  Valida OTP                                                        │
│       ▼                                                                     │
│  [Gera novo JWT]                                                           │
│  [Salva no localStorage]                                                   │
│  router.push('/renda')  ← Continua de onde parou!                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Fluxo de Acesso por Link Direto

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE ACESSO POR LINK DIRETO                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CENÁRIO: Usuário recebe link por WhatsApp/SMS para continuar              │
│                                                                             │
│  Link: credito.cashly.com.br/j/550e8400-e29b-41d4-a716-446655440000        │
│                                  ▲                                          │
│                                  │                                          │
│                            token da jornada                                │
│                         (device_modelo.token)                              │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  Acessa URL /j/{token}                                                     │
│       │                                                                     │
│       ▼                                                                     │
│  GET /api/journey-by-token/{token} ─────────────────────────►              │
│       │                                              │                      │
│       │                                              ▼                      │
│       │                                  ┌─────────────────────┐           │
│       │                                  │ SELECT dm.*, l.*    │           │
│       │                                  │ FROM device_modelo dm│           │
│       │                                  │ JOIN lead l ON      │           │
│       │                                  │   l.id = dm.lead_id │           │
│       │                                  │ WHERE dm.token = ?  │           │
│       │                                  └──────────┬──────────┘           │
│       │                                             │                       │
│       │                                ┌────────────┴────────────┐         │
│       │                                │                         │         │
│       │                                ▼                         ▼         │
│       │                          [Não encontrou]          [Encontrou]     │
│       │                                │                         │         │
│       │                                ▼                         │         │
│       │                          Return 404                      │         │
│       │                                │                         │         │
│       │◄───────────────────────────────┤                         │         │
│       │                                │                         │         │
│       ▼                                │                         │         │
│  [Mostra erro]                         │                         │         │
│  "Link inválido"                       │                         │         │
│                                        │                         │         │
│                                        │      ┌──────────────────┘         │
│                                        │      │                            │
│                                        │      ▼                            │
│                                        │ Verifica status:                  │
│                                        │      │                            │
│                                        │      ├── status = 'completed'    │
│                                        │      │       │                    │
│                                        │      │       ▼                    │
│                                        │      │  [Mostra: "Já concluída"] │
│                                        │      │                            │
│                                        │      ├── status = 'rejected'     │
│                                        │      │       │                    │
│                                        │      │       ▼                    │
│                                        │      │  [Mostra: "Não aprovada"] │
│                                        │      │                            │
│                                        │      ├── status = 'expired'      │
│                                        │      │       │                    │
│                                        │      │       ▼                    │
│                                        │      │  [Mostra: "Expirada"]     │
│                                        │      │  [Oferece iniciar nova]   │
│                                        │      │                            │
│                                        │      └── status = 'in_progress'  │
│                                        │              │                    │
│                                        │              ▼                    │
│                                        │      Verifica Blacklist:          │
│                                        │              │                    │
│                                        │              ├── Blacklist = true│
│                                        │              │       │            │
│                                        │              │       ▼            │
│                                        │              │  [Mostra: Bloqueado]
│                                        │              │                    │
│                                        │              └── Blacklist = false│
│                                        │                      │            │
│                                        │                      ▼            │
│                                        │              Envia OTP para      │
│                                        │              telefone do lead    │
│                                        │                      │            │
│       │◄──────────────────────────────────────────────────────┘            │
│       │  { journey_id, current_step, phone_last4 }                         │
│       │                                                                     │
│       ▼                                                                     │
│  [Tela de OTP]                                                             │
│  "Confirme seu acesso"                                                     │
│       │                                                                     │
│       │  Valida OTP                                                        │
│       ▼                                                                     │
│  router.push('/{current_step}')                                            │
│  (Continua de onde parou!)                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Fluxo de Analytics/Eventos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FLUXO DE EVENTOS (ANALYTICS)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CADA AÇÃO IMPORTANTE GERA UM EVENTO:                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  journey_events                                                     │   │
│  │  ────────────────                                                   │   │
│  │  device_modelo_id │ event_type      │ step_name │ metadata          │   │
│  │  ─────────────────┼─────────────────┼───────────┼──────────────────│   │
│  │  123              │ otp_sent        │ otp       │ {phone_last4}     │   │
│  │  123              │ otp_failed      │ otp       │ {attempts: 1}     │   │
│  │  123              │ otp_verified    │ otp       │ {}                │   │
│  │  123              │ step_started    │ device    │ {}                │   │
│  │  123              │ step_completed  │ device    │ {model: SM-S918B} │   │
│  │  123              │ step_started    │ uber      │ {}                │   │
│  │  123              │ rpa_started     │ uber      │ {platform: uber}  │   │
│  │  123              │ rpa_completed   │ uber      │ {score: 750}      │   │
│  │  123              │ step_completed  │ uber      │ {}                │   │
│  │  123              │ offer_shown     │ offer     │ {valor: 1500}     │   │
│  │  123              │ offer_accepted  │ offer     │ {}                │   │
│  │  123              │ step_completed  │ knox      │ {imei: ...}       │   │
│  │  123              │ contract_signed │ contract  │ {contract_id: ...}│   │
│  │  123              │ journey_completed│ -        │ {total_time: ...} │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  TIPOS DE EVENTO:                                                          │
│                                                                             │
│  event_type           │ Descrição                                          │
│  ─────────────────────┼────────────────────────────────────────────────── │
│  otp_sent             │ OTP enviado por SMS                                │
│  otp_failed           │ Tentativa de OTP falhou                            │
│  otp_verified         │ OTP validado com sucesso                           │
│  step_started         │ Usuário entrou na etapa                            │
│  step_completed       │ Usuário completou a etapa                          │
│  step_failed          │ Etapa falhou (reprovação)                          │
│  rpa_started          │ RPA iniciou processamento                          │
│  rpa_completed        │ RPA finalizou processamento                        │
│  rpa_failed           │ RPA falhou                                         │
│  offer_shown          │ Oferta exibida ao usuário                          │
│  offer_accepted       │ Oferta aceita                                      │
│  offer_rejected       │ Oferta recusada                                    │
│  contract_signed      │ Contrato assinado                                  │
│  session_expired      │ Sessão expirou                                     │
│  session_recovered    │ Sessão recuperada                                  │
│  journey_completed    │ Jornada concluída com sucesso                      │
│  journey_rejected     │ Jornada rejeitada                                  │
│  journey_abandoned    │ Jornada abandonada (expirou)                       │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  QUERIES DE ANALYTICS:                                                     │
│                                                                             │
│  -- Funil de conversão                                                     │
│  SELECT * FROM v_journey_funnel;                                           │
│                                                                             │
│  -- Dropout por etapa                                                      │
│  SELECT * FROM v_dropout_by_step;                                          │
│                                                                             │
│  -- Tempo médio por etapa                                                  │
│  SELECT * FROM v_avg_time_per_step;                                        │
│                                                                             │
│  -- Performance por modelo                                                 │
│  SELECT * FROM v_performance_by_device;                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Diagrama de Estados da Jornada

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ESTADOS DA JORNADA (device_modelo)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌──────────────┐                              │
│                              │    inicio    │                              │
│                              └──────┬───────┘                              │
│                                     │                                       │
│                                     ▼                                       │
│                              ┌──────────────┐                              │
│                              │     otp      │                              │
│                              └──────┬───────┘                              │
│                                     │                                       │
│                           ┌─────────┴─────────┐                            │
│                           │                   │                            │
│                           ▼                   ▼                            │
│                    ┌──────────────┐    ┌──────────────┐                    │
│                    │    device    │    │   expired    │                    │
│                    └──────┬───────┘    └──────────────┘                    │
│                           │                                                 │
│                  ┌────────┴────────┐                                       │
│                  │                 │                                       │
│                  ▼                 ▼                                       │
│           ┌──────────────┐  ┌──────────────┐                               │
│           │     uber     │  │   rejected   │ ← Device não elegível        │
│           └──────┬───────┘  └──────────────┘                               │
│                  │                                                          │
│         ┌────────┴────────┐                                                │
│         │                 │                                                │
│         ▼                 ▼                                                │
│  ┌──────────────┐  ┌──────────────┐                                        │
│  │    offer     │  │   rejected   │ ← Renda insuficiente                  │
│  └──────┬───────┘  └──────────────┘                                        │
│         │                                                                   │
│         │ Aceita oferta                                                    │
│         ▼                                                                   │
│  ┌──────────────┐                                                          │
│  │     knox     │                                                          │
│  └──────┬───────┘                                                          │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐                                                          │
│  │   contract   │                                                          │
│  └──────┬───────┘                                                          │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐                                                          │
│  │  completed   │ ← status = 'completed'                                  │
│  └──────────────┘                                                          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  VALORES DE status:                                                        │
│  • in_progress → Jornada em andamento                                      │
│  • completed   → Jornada concluída com sucesso                             │
│  • rejected    → Jornada rejeitada (device, renda, etc)                    │
│  • expired     → Jornada expirou (24h sem atividade)                       │
│  • abandoned   → Usuário abandonou (não retornou)                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Fluxo de Segurança (Rate Limiting)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE RATE LIMITING                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROTEÇÃO 1: Envio de OTP                                                  │
│  ════════════════════════                                                   │
│                                                                             │
│  Regra: Máximo 3 envios de OTP por telefone por hora                       │
│                                                                             │
│  Request /api/iniciar-jornada                                              │
│       │                                                                     │
│       ▼                                                                     │
│  [Verifica contador no Redis/Memory]                                       │
│       │                                                                     │
│       ├── count < 3 → Permite, incrementa contador                         │
│       │                                                                     │
│       └── count >= 3 → Bloqueia                                            │
│               │                                                             │
│               ▼                                                             │
│          Return 429: "Muitas tentativas. Aguarde 1 hora."                  │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  PROTEÇÃO 2: Validação de OTP                                              │
│  ════════════════════════════                                               │
│                                                                             │
│  Regra: Máximo 3 tentativas erradas por sessão                             │
│                                                                             │
│  Request /api/validar-otp                                                  │
│       │                                                                     │
│       ▼                                                                     │
│  [Verifica campo attempts em otp_codes]                                    │
│       │                                                                     │
│       ├── attempts < 3 → Valida código                                     │
│       │       │                                                            │
│       │       ├── Código correto → Sucesso                                 │
│       │       │                                                            │
│       │       └── Código errado → Incrementa attempts                      │
│       │                                                                     │
│       └── attempts >= 3 → Bloqueia sessão                                  │
│               │                                                             │
│               ▼                                                             │
│          UPDATE device_modelo SET status = 'blocked'                       │
│          Return 429: "Muitas tentativas. Bloqueado por 1 hora."            │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  PROTEÇÃO 3: Rate limit geral por IP                                       │
│  ═══════════════════════════════════                                        │
│                                                                             │
│  Regra: Máximo 10 requests por IP por minuto                               │
│                                                                             │
│  Qualquer request                                                          │
│       │                                                                     │
│       ▼                                                                     │
│  [Middleware de rate limit]                                                │
│       │                                                                     │
│       ├── count < 10 → Permite                                             │
│       │                                                                     │
│       └── count >= 10 → Bloqueia                                           │
│               │                                                             │
│               ▼                                                             │
│          Return 429: "Muitas requisições. Tente novamente em 1 minuto."    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```
