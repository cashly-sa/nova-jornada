# SEGURANCA.md - Seguranca

> Autenticacao OTP, protecao de rotas e validacao de dados

## Autenticacao

### Estrategia
Token UUID + OTP via SMS (sem senhas tradicionais).

### Fluxo
```
1. Usuario informa CPF
         │
         ▼
2. Sistema cria jornada com token UUID
         │
         ▼
3. OTP de 6 digitos enviado via SMS
         │
         ▼
4. Usuario insere codigo (max 3 tentativas)
         │
         ▼
5. Codigo validado → sessao ativa por 20 min
         │
         ▼
6. Jornada expira em 24h
```

### Configuracao
- OTP: 6 digitos numericos
- Validade OTP: 20 minutos
- Max tentativas: 3 por codigo
- Rate limit: 10 OTPs/hora por jornada
- Expiracao jornada: 24 horas

### Tokens
| Tipo | Expiracao | Uso |
|------|-----------|-----|
| Token UUID | 24h | Identificar jornada |
| OTP | 20min | Autenticar usuario |
| code_hash | - | Armazenamento seguro |

## Autorizacao

### Roles
| Role | Descricao | Permissoes |
|------|-----------|------------|
| Usuario | Motorista na jornada | Acessar steps sequencialmente |
| Admin | Administrador interno | Visualizar dispositivos |

### Verificacao
- `SessionGuard` verifica OTP valido e step correto
- Usuario so pode acessar step atual ou anteriores
- Tentativa de acessar step futuro redireciona para atual

## Protecoes

### Rate Limiting
```
OTP Send: 10 requests/hora por journeyId
OTP Verify: 3 tentativas por codigo

Implementacao: Contagem em tabela otp_codes
```

### CORS
Configuracao padrao Next.js (same-origin).

### Headers (next.config.ts)
```javascript
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
]
poweredByHeader: false
```

### Sanitizacao
- Entrada: `onlyNumbers()` remove caracteres nao numericos
- CPF: Validacao com digitos verificadores
- Telefone: Validacao de DDD brasileiro
- IMEI: Algoritmo de Luhn

## Senhas

### Requisitos
N/A - Sistema usa OTP, nao senhas.

### Hash
OTP armazenado como hash SHA-256:
```javascript
const hash = await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(code)
)
```

### Reset
N/A - Usuario pode solicitar novo OTP a qualquer momento (respeitando rate limit).

## Banco de Dados

### Prevencao de Injection
- Supabase usa queries parametrizadas internamente
- Nenhuma interpolacao de string em queries
- Todas as entradas validadas antes de queries

```javascript
// CORRETO - Parametrizado
supabase.from('lead').select('*').eq('cpf', cpf)

// NUNCA FAZER - String interpolation
supabase.from('lead').select('*').filter(`cpf = '${cpf}'`)
```

### Dados Sensiveis
| Campo | Protecao |
|-------|----------|
| OTP | Armazenado como SHA-256 hash |
| Telefone | Mascara em exibicao (*****1234) |
| CPF | Formatado com mascaras |
| API Keys | Apenas em .env.local (nao versionado) |

## Variaveis Sensiveis

### Armazenamento
- **Producao:** (SEM INFORMACAO DE CONTEXTO - usar Vercel Secrets)
- **Desenvolvimento:** `.env.local` (nao versionado)

### Variaveis
```env
# Publicas (ok em .env)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:4500

# Secretas (apenas .env.local)
CLICKSEND_USERNAME=email@exemplo.com
CLICKSEND_API_KEY=uuid-da-api-key
```

## Checklist

### Antes do Deploy
- [ ] Verificar .env.local nao esta no git
- [ ] Confirmar rate limiting ativo
- [ ] Testar expiracao de OTP (20min)
- [ ] Testar expiracao de jornada (24h)
- [ ] Verificar headers de seguranca

### Periodico
- [ ] Revisar logs de tentativas de OTP
- [ ] Verificar dispositivos bloqueados
- [ ] Auditar acessos admin
- [ ] Atualizar dependencias (npm audit)

### Nunca Fazer
- Armazenar OTP em texto plano
- Expor API keys no frontend (exceto NEXT_PUBLIC_*)
- Desabilitar rate limiting
- Permitir SQL injection (strings interpoladas)
- Commitar .env.local ou .env*.local
- Confiar em dados do cliente sem validar

## Resposta a Incidentes

### Procedimento
1. Identificar escopo do incidente
2. Bloquear acesso se necessario (blacklist)
3. Revogar tokens comprometidos
4. Notificar equipe de seguranca
5. Documentar e corrigir vulnerabilidade

### Contatos
- **Seguranca:** (SEM INFORMACAO DE CONTEXTO)

## Validacoes Implementadas

### src/utils/validators.ts
```typescript
validateCPF(cpf)      // Algoritmo mod 11
validatePhone(phone)  // DDD brasileiro valido
validateIMEI(imei)    // Algoritmo de Luhn
validateCEP(cep)      // 8 digitos
validateDate(date)    // Formato + idade >= 18
isValidEmail(email)   // Regex RFC
isValidUUID(uuid)     // Formato UUID v4
```

### src/schemas/cadastro.schema.ts
```typescript
// Zod schema com validacoes customizadas
dadosPessoaisSchema = z.object({
  nome: z.string().min(3).refine(has2Words),
  email: z.string().email(),
  telefone: z.string().refine(validatePhone),
  dataNascimento: z.string().refine(isAdult)
})
```

---

*Ultima atualizacao: 2025-12-22*
