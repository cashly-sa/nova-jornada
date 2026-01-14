# TESTES.md - Estrategia de Testes

> Documentacao sobre testes e qualidade de codigo

## Stack

(SEM INFORMACAO DE CONTEXTO - nenhum framework de testes configurado)

**Recomendacao:**
- **Unitarios:** Jest + React Testing Library
- **Integracao:** Jest
- **E2E:** Playwright ou Cypress
- **Coverage:** Jest built-in

## Estrutura

(SEM INFORMACAO DE CONTEXTO - nao existe pasta de testes)

**Recomendacao:**
```
src/
├── __tests__/              # Testes unitarios
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── api/
├── e2e/                    # Testes E2E
│   ├── journey.spec.ts
│   └── otp.spec.ts
└── ...
```

## Comandos

### Disponivel
```bash
npm run lint    # Verificar codigo com ESLint
```

### Recomendados (apos configurar Jest)
```bash
npm test              # Rodar todos os testes
npm run test:watch    # Modo watch
npm run test:coverage # Relatorio de cobertura
npm run test:e2e      # Testes E2E
```

## Convencoes

### Nomenclatura
(Recomendacao)
- Arquivos: `NomeDoArquivo.test.ts` ou `NomeDoArquivo.spec.ts`
- Testes E2E: `fluxo.e2e.ts`

### Organizacao
(Recomendacao)
```typescript
describe('NomeDoModulo', () => {
  describe('nomeDaFuncao', () => {
    it('deve fazer X quando Y', () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

## Testes Unitarios

### Recomendados para Implementar

#### Validadores (src/utils/validators.ts)
```typescript
describe('validateCPF', () => {
  it('deve retornar true para CPF valido', () => {
    expect(validateCPF('12345678909')).toBe(true)
  })

  it('deve retornar false para CPF invalido', () => {
    expect(validateCPF('11111111111')).toBe(false)
  })

  it('deve retornar false para CPF com tamanho incorreto', () => {
    expect(validateCPF('123456789')).toBe(false)
  })
})

describe('validateIMEI', () => {
  it('deve validar IMEI com algoritmo de Luhn', () => {
    expect(validateIMEI('490154203237518')).toBe(true)
  })
})
```

#### Hooks (src/hooks/)
```typescript
describe('useJourneyStore', () => {
  it('deve inicializar com estado padrao', () => {
    // ...
  })

  it('deve persistir estado em localStorage', () => {
    // ...
  })

  it('isOtpValid deve retornar false apos 20 minutos', () => {
    // ...
  })
})
```

#### Componentes (src/components/)
```typescript
describe('SessionGuard', () => {
  it('deve redirecionar se OTP expirado', () => {
    // ...
  })

  it('deve permitir acesso se OTP valido', () => {
    // ...
  })
})
```

## Testes de Integracao

### Recomendados para Implementar

#### API Routes
```typescript
describe('POST /api/otp/send', () => {
  it('deve enviar OTP com sucesso', async () => {
    // ...
  })

  it('deve respeitar rate limit', async () => {
    // ...
  })
})

describe('POST /api/otp/verify', () => {
  it('deve validar codigo correto', async () => {
    // ...
  })

  it('deve rejeitar codigo incorreto', async () => {
    // ...
  })

  it('deve bloquear apos 3 tentativas', async () => {
    // ...
  })
})
```

## Testes E2E

### Fluxos Criticos para Testar
- [ ] Jornada completa: CPF → Sucesso
- [ ] Expiracao de OTP (20 minutos)
- [ ] Expiracao de jornada (24 horas)
- [ ] Dispositivo nao elegivel
- [ ] Recuperacao de sessao
- [ ] Rate limiting de OTP

### Exemplo Playwright
```typescript
test('jornada completa de credito', async ({ page }) => {
  // Step 00: CPF
  await page.goto('/')
  await page.fill('[name="cpf"]', '12345678909')
  await page.click('button[type="submit"]')

  // Step 01: OTP
  await expect(page).toHaveURL('/credito/otp')
  // ... continuar fluxo
})
```

## Coverage

### Metas (Recomendacao)
| Tipo | Meta |
|------|------|
| Statements | 80% |
| Branches | 70% |
| Functions | 80% |
| Lines | 80% |

### Configuracao
(SEM INFORMACAO DE CONTEXTO)

## Mocks

### Recomendacoes
- Supabase: Mock via MSW ou jest.mock
- ClickSend: Mock completo (nao enviar SMS em testes)
- navigator.sendBeacon: Mock para Beacon API

```typescript
// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    }))
  }
}))
```

## Fixtures

### Recomendacao
```
src/__tests__/fixtures/
├── leads.json           # Dados de leads de teste
├── journeys.json        # Jornadas em varios estados
├── devices.json         # Dispositivos elegiveis/nao elegiveis
└── otp.json            # Codigos OTP de teste
```

## Checklist

### Antes de PR
- [ ] Rodar `npm run lint` sem erros
- [ ] Rodar `npm run build` sem erros
- [ ] (Futuro) Rodar `npm test` sem falhas
- [ ] (Futuro) Coverage minima atingida

### O Que Testar
- Validadores (CPF, telefone, IMEI, etc)
- Logica de expiracao de OTP
- Logica de steps/navegacao
- Endpoints de API
- Componentes com logica complexa

### O Que NAO Testar
- Estilos CSS/Tailwind
- Componentes puramente visuais
- Bibliotecas de terceiros (Radix, Zod, etc)
- Configuracoes estaticas

## Proximos Passos

1. **Instalar dependencias de teste:**
   ```bash
   npm install -D jest @types/jest @testing-library/react @testing-library/jest-dom
   ```

2. **Configurar Jest:**
   - Criar `jest.config.js`
   - Configurar transformers para TypeScript
   - Configurar paths aliases

3. **Criar primeiros testes:**
   - Comecar pelos validadores (mais simples)
   - Expandir para hooks
   - Adicionar testes de API

4. **Configurar E2E:**
   ```bash
   npm install -D @playwright/test
   npx playwright install
   ```

---

*Ultima atualizacao: 2025-12-22*
