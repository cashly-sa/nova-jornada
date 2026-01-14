# FRONTEND.md - Interface e Componentes

> Interface mobile-first com React 19, Tailwind CSS e Zustand

## Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, Radix UI
- **Estilo:** Tailwind CSS 3.4.17
- **Estado:** Zustand 5.0.2 (com localStorage)
- **Forms:** React Hook Form 7.54.2 + Zod 3.24.1
- **Icones:** Lucide React 0.468.0

## Estrutura de Componentes

```
src/components/
├── CashlyLogo.tsx          # Logo da marca (tamanhos sm, md)
├── JourneyProgress.tsx     # Barra de progresso com steps
├── MobileOnly.tsx          # Wrapper que bloqueia desktop
├── SessionGuard.tsx        # Protecao de rotas autenticadas
└── PalencaModal.tsx        # Modal para integracao Palenca
```

## Componentes Base

### CashlyLogo
Logo da marca com variantes de tamanho.
```tsx
<CashlyLogo size="md" />  // sm | md
```

### JourneyProgress
Barra de progresso visual mostrando steps completados.
```tsx
<JourneyProgress currentStep="03" />
// Mostra: 01 ✓ | 02 ✓ | 03 • | 04 | 05 | 06 | 07
```

### MobileOnly
Wrapper que restringe acesso a dispositivos moveis.
```tsx
<MobileOnly>
  <ConteudoMobile />
</MobileOnly>
// Desktop ve mensagem de erro
```

### SessionGuard
Protege rotas que requerem autenticacao/step especifico.
```tsx
<SessionGuard requiredStep="03" redirectTo="/credito/otp">
  <PaginaProtegida />
</SessionGuard>
// Redireciona se OTP expirado ou step incorreto
```

### PalencaModal
Modal para integracao com widget Palenca (verificacao de renda).
```tsx
<PalencaModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  platform="uber"  // uber | 99
  onSuccess={(data) => handleSuccess(data)}
/>
```

## Rotas

### Estrutura
```
/                          → CPF entry (Step 00)
/cadastro                  → Cadastro novo cliente (Step 00b)
/credito/otp              → Verificacao OTP (Step 01)
/credito/device           → Elegibilidade dispositivo (Step 02)
/credito/renda            → Verificacao renda (Step 03)
/credito/oferta           → Exibicao oferta (Step 04)
/credito/knox             → Samsung Knox (Step 05)
/credito/contrato         → Assinatura contrato (Step 06)
/credito/sucesso          → Sucesso (Step 07)
/admin/devices            → Painel admin
```

### Protecao de Rotas
Todas as rotas `/credito/*` sao protegidas por `SessionGuard`:
- Verifica se OTP foi validado (< 20 minutos)
- Verifica se usuario esta no step correto
- Redireciona para step atual se tentar acessar step futuro
- Redireciona para `/credito/otp` se OTP expirado

## Gerenciamento de Estado

### Zustand Store (useJourneyStore)
Estado global persistido em localStorage.

```tsx
const {
  // Dados do lead
  cpf, leadId, leadData,

  // Dados da jornada
  journeyId, token, currentStep,

  // Autenticacao
  otpVerified, otpVerifiedAt, isOtpValid,

  // Dados coletados
  deviceInfo, valorAprovado,
  rendaInfo, knoxImei, contratoId,

  // Acoes
  setStep, setOtpVerified, setDeviceInfo,
  clearForNewOtp, reset
} = useJourneyStore()
```

### Hidratacao
Usar `useHydration()` para evitar mismatch SSR/cliente.

```tsx
const hydrated = useHydration()
if (!hydrated) return <Loading />
// Agora pode acessar estado persistido
```

## Formularios

### Padrao
Todos os formularios usam React Hook Form + Zod.

```tsx
const schema = z.object({
  cpf: z.string().refine(validateCPF, 'CPF invalido'),
  telefone: z.string().refine(validatePhone, 'Telefone invalido')
})

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
})
```

### Validacao
Validacoes customizadas em `src/utils/validators.ts`:
- `validateCPF()` - Digitos verificadores
- `validatePhone()` - DDD valido
- `validateIMEI()` - Algoritmo Luhn
- `validateCEP()` - 8 digitos
- Formatadores: `formatCPF()`, `formatPhone()`, etc.

## Integracao com API

### Cliente HTTP
Fetch nativo do navegador. Formato padrao:

```tsx
const response = await fetch('/api/otp/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ journeyId, phone })
})
const { success, data, error } = await response.json()
```

### Beacon API (Eventos)
Para eventos que devem ser entregues mesmo ao fechar pagina:

```tsx
navigator.sendBeacon('/api/journey/event', JSON.stringify({
  journeyId,
  eventType: 'button_click',
  metadata: { buttonId: 'submit' }
}))
```

## Custom Hooks

### useSessionRecovery
Recupera sessao ao carregar app, sincroniza com backend.

```tsx
const { isValidating, error } = useSessionRecovery()
```

### useEventTracker
Tracking de interacoes do usuario.

```tsx
const { trackClick, trackInputFilled, trackStepCompleted } = useEventTracker()
trackClick('submit-button')
```

### useHeartbeat
Mantém sessao ativa com pings periodicos (30s).

```tsx
useHeartbeat(journeyId)
```

### useAbandonmentTracker
Detecta abandono de pagina e registra.

```tsx
useAbandonmentTracker(journeyId, currentStep)
```

### usePreventBackNavigation
Impede usuario de voltar com botao do navegador.

```tsx
usePreventBackNavigation()
```

## Feedback ao Usuario

### Notificacoes
(SEM INFORMACAO DE CONTEXTO - usar Radix Toast se necessario)

### Loading
Spinner simples durante operacoes assincronas:

```tsx
{isLoading && (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
)}
```

### Erros
Mensagens inline abaixo dos campos:

```tsx
{errors.cpf && (
  <p className="text-red-500 text-sm mt-1">{errors.cpf.message}</p>
)}
```

## Acessibilidade

- Radix UI componentes sao acessiveis por padrao
- Labels associados a inputs via `htmlFor`
- Mensagens de erro com `aria-describedby`
- Focus visivel em todos os elementos interativos

## Responsividade

### Breakpoints (Tailwind)
| Nome | Valor | Uso |
|------|-------|-----|
| sm | 640px | Tablets pequenos |
| md | 768px | Tablets |
| lg | 1024px | Desktop (bloqueado) |
| xl | 1280px | Desktop large (bloqueado) |

### Padroes
- **Mobile-first:** Classes base para mobile, prefixos para maior
- **Desktop bloqueado:** MobileOnly impede acesso em telas > 768px
- **Viewport fixo:** `width=device-width, maximum-scale=1, user-scalable=false`

---

*Ultima atualizacao: 2025-12-22*
