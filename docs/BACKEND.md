# BACKEND.md - API e Banco de Dados

> API Routes Next.js com Supabase PostgreSQL para jornada de credito

## Visao Geral

- **Base URL (Prod):** (SEM INFORMACAO DE CONTEXTO)
- **Base URL (Local):** http://localhost:4500/api
- **Formato:** JSON
- **Autenticacao:** Token UUID + OTP SMS

## Autenticacao

### Headers
```http
Content-Type: application/json
```

### Fluxo
1. Usuario informa CPF
2. Sistema cria/recupera jornada com token UUID
3. OTP enviado via SMS (6 digitos)
4. Usuario valida OTP (max 3 tentativas)
5. Token valido por 24h, OTP valido por 20min

### Endpoints de Auth

#### POST /api/otp/send
Envia codigo OTP via SMS.

```json
// Request
{
  "journeyId": "uuid",
  "phone": "11999999999"
}

// Response 200
{
  "success": true,
  "data": {
    "sent": true,
    "expiresAt": "2025-01-01T00:20:00Z"
  }
}

// Response 429 (Rate limit)
{
  "success": false,
  "error": "Limite de OTPs atingido"
}
```

#### POST /api/otp/verify
Verifica codigo OTP.

```json
// Request
{
  "journeyId": "uuid",
  "code": "123456"
}

// Response 200
{
  "success": true,
  "data": {
    "valid": true,
    "currentStep": "02"
  }
}

// Response 400
{
  "success": false,
  "error": "Codigo invalido ou expirado"
}
```

## Endpoints

### OTP

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | /api/otp/send | Enviar OTP via SMS | Nao |
| POST | /api/otp/verify | Verificar codigo OTP | Nao |

### Device

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | /api/device/validate | Validar elegibilidade do dispositivo | Token |

#### POST /api/device/validate
```json
// Request
{
  "journeyId": "uuid",
  "modelo": "SM-A155M",
  "fabricante": "Samsung"
}

// Response 200 (aprovado)
{
  "success": true,
  "data": {
    "eligible": true,
    "valorAprovado": 2500.00,
    "nomeComercial": "Galaxy A15"
  }
}

// Response 200 (rejeitado)
{
  "success": true,
  "data": {
    "eligible": false,
    "reason": "Modelo nao elegivel"
  }
}
```

### Journey

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | /api/journey/validate | Validar sessao/jornada | Token |
| POST | /api/journey/step | Atualizar step atual | Token |
| POST | /api/journey/event | Registrar evento | Token |
| POST | /api/journey/abandon | Registrar abandono | Token |

#### POST /api/journey/validate
Valida token e retorna estado completo da jornada.

```json
// Request
{
  "token": "uuid"
}

// Response 200
{
  "success": true,
  "data": {
    "valid": true,
    "journey": {
      "id": "uuid",
      "status": "in_progress",
      "currentStep": "03",
      "otpVerifiedAt": "2025-01-01T00:00:00Z",
      "deviceInfo": { "modelo": "SM-A155M" },
      "valorAprovado": 2500.00
    },
    "lead": {
      "cpf": "12345678901",
      "nome": "Joao Silva",
      "telefone": "11999999999"
    }
  }
}

// Response 404
{
  "success": false,
  "error": "not_found"
}

// Response 410
{
  "success": false,
  "error": "journey_expired"
}
```

#### POST /api/journey/step
```json
// Request
{
  "journeyId": "uuid",
  "step": "04"
}

// Response 200
{
  "success": true
}
```

#### POST /api/journey/event
```json
// Request
{
  "journeyId": "uuid",
  "eventType": "button_click",
  "stepName": "otp",
  "metadata": {
    "buttonId": "submit-otp"
  }
}

// Response 200
{
  "success": true
}
```

### Heartbeat

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | /api/heartbeat | Manter sessao ativa | Token |

#### POST /api/heartbeat
```json
// Request
{
  "journeyId": "uuid"
}

// Response 200
{
  "success": true
}
```

## Banco de Dados

### Schema Principal (device_modelo)
```sql
CREATE TABLE device_modelo (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES lead(id),
  token UUID UNIQUE DEFAULT gen_random_uuid(),
  jornada_step TEXT DEFAULT '00',
  status TEXT DEFAULT 'pending',

  -- Dispositivo
  modelo TEXT,
  fabricante TEXT,
  "Aprovado CEL" BOOLEAN,
  valor_aprovado NUMERIC,
  device_attempts INT DEFAULT 0,

  -- Timestamps
  otp_verified_at TIMESTAMPTZ,
  device_checked_at TIMESTAMPTZ,
  uber_checked_at TIMESTAMPTZ,
  offer_shown_at TIMESTAMPTZ,
  offer_accepted_at TIMESTAMPTZ,
  knox_enrolled_at TIMESTAMPTZ,
  contrato_assinado_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,

  -- Dados adicionais
  dados_uber JSONB,
  dados_99 JSONB,
  plataforma_escolhida TEXT,
  knox_imei TEXT,
  contrato_id UUID,
  contrato_assinado BOOLEAN,

  -- Auditoria
  ip_address INET,
  user_agent TEXT,
  rejection_reason TEXT
);
```

### Schema OTP (otp_codes)
```sql
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_modelo_id BIGINT REFERENCES device_modelo(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(device_modelo_id, used) WHERE NOT used
);
```

### Schema Eventos (journey_events)
```sql
CREATE TABLE journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_modelo_id BIGINT REFERENCES device_modelo(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  step_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Schema Dispositivos Elegiveis (eligible_devices)
```sql
CREATE TABLE eligible_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model_pattern TEXT NOT NULL,  -- regex
  min_year INT,
  min_android_version TEXT,
  description TEXT,
  active BOOLEAN DEFAULT TRUE
);
```

### Indices
```sql
CREATE INDEX idx_device_modelo_token ON device_modelo(token);
CREATE INDEX idx_device_modelo_lead_active ON device_modelo(lead_id, status);
CREATE INDEX idx_device_modelo_step ON device_modelo(jornada_step);
CREATE INDEX idx_otp_codes_valid ON otp_codes(device_modelo_id) WHERE NOT used;
CREATE INDEX idx_journey_events_device ON journey_events(device_modelo_id);
```

### Queries Comuns
```sql
-- Buscar jornada por token
SELECT dm.*, l.cpf, l.nome, l.telefone
FROM device_modelo dm
JOIN lead l ON dm.lead_id = l.id
WHERE dm.token = $1;

-- Verificar OTP valido
SELECT * FROM otp_codes
WHERE device_modelo_id = $1
  AND NOT used
  AND expires_at > NOW()
ORDER BY created_at DESC
LIMIT 1;

-- Contar tentativas de OTP na ultima hora
SELECT COUNT(*) FROM otp_codes
WHERE device_modelo_id = $1
  AND created_at > NOW() - INTERVAL '1 hour';

-- Verificar elegibilidade de dispositivo
SELECT * FROM eligible_devices
WHERE active = true
  AND $1 ~* model_pattern;
```

## Padroes de Resposta

### Sucesso
```json
{
  "success": true,
  "data": { ... }
}
```

### Erro
```json
{
  "success": false,
  "error": "mensagem_de_erro"
}
```

### Status Codes
| Code | Uso |
|------|-----|
| 200 | Sucesso |
| 400 | Dados invalidos |
| 404 | Recurso nao encontrado |
| 410 | Jornada expirada |
| 429 | Rate limit excedido |
| 500 | Erro interno |

## Validacao

- **CPF:** Algoritmo com digitos verificadores (mod 11)
- **Telefone:** DDD valido + 10-11 digitos
- **OTP:** 6 digitos numericos
- **UUID:** Formato RFC 4122
- **IMEI:** Algoritmo de Luhn

## Variaveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# SMS (ClickSend)
CLICKSEND_USERNAME=email@exemplo.com
CLICKSEND_API_KEY=uuid-da-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:4500
```

## Logs

- Eventos registrados em `journey_events` com metadata JSON
- Tipos de evento: session, navigation, interaction, form, otp, device, renda, oferta, knox, contrato, success, mobile, technical
- Beacon API garante entrega mesmo ao fechar pagina

---

*Ultima atualizacao: 2025-12-22*
