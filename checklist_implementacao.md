# Checklist de Implementação - Jornada de Crédito

> **Projeto:** Jornada de Crédito Cashly  
> **Data de Início:** ___/___/____  
> **Responsável:** _________________

---

## Fase 0: Preparação

### Ambiente
- [ ] Criar projeto Next.js 14 com App Router
- [ ] Configurar TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Instalar Shadcn/ui
- [ ] Configurar ESLint e Prettier
- [ ] Criar repositório Git
- [ ] Configurar variáveis de ambiente (.env.local)

### Supabase
- [ ] Verificar acesso ao projeto existente
- [ ] Executar migrations SQL
- [ ] Verificar se tabelas foram criadas corretamente
- [ ] Testar funções auxiliares (get_or_create_journey, etc)
- [ ] Verificar RLS policies

### Dependências
```bash
npm install @supabase/supabase-js @supabase/ssr zustand jsonwebtoken
npx shadcn-ui@latest add button input card alert progress badge
```

---

## Fase 1: Estrutura Base

### Configuração Supabase
- [ ] Criar `src/lib/supabase/client.ts` (cliente browser)
- [ ] Criar `src/lib/supabase/server.ts` (cliente server)
- [ ] Criar `src/lib/supabase/types.ts` (tipos gerados)
- [ ] Testar conexão com banco

### Store (Zustand)
- [ ] Criar `src/stores/journeyStore.ts`
- [ ] Implementar persistência no localStorage
- [ ] Testar hydration do store

### Layout
- [ ] Criar layout principal (`src/app/layout.tsx`)
- [ ] Implementar ProgressBar das etapas
- [ ] Configurar fontes e tema

### Utilitários
- [ ] Criar `src/lib/utils/masks.ts` (máscaras de input)
- [ ] Criar `src/lib/validation/cpf.ts` (validação CPF)
- [ ] Criar `src/lib/auth/jwt.ts` (utilitários JWT)
- [ ] Criar `src/lib/utils/analytics.ts` (track de eventos)

---

## Fase 2: Página CPF

### Frontend
- [ ] Criar página `src/app/page.tsx`
- [ ] Criar componente `CPFInput.tsx`
  - [ ] Máscara XXX.XXX.XXX-XX
  - [ ] Validação de dígitos verificadores
  - [ ] Estado de loading
  - [ ] Tratamento de erros
- [ ] Design responsivo (mobile-first)
- [ ] Testes de usabilidade

### Backend (Edge Function)
- [ ] Criar `supabase/functions/iniciar-jornada/index.ts`
  - [ ] Validar formato CPF
  - [ ] Buscar lead pelo CPF
  - [ ] Verificar Blacklist
  - [ ] Chamar get_or_create_journey()
  - [ ] Gerar OTP
  - [ ] Salvar OTP hash no banco
  - [ ] Enviar SMS (mock inicial)
  - [ ] Registrar evento
  - [ ] Retornar dados
- [ ] Deploy da Edge Function
- [ ] Testes de integração

---

## Fase 3: Página OTP

### Frontend
- [ ] Criar página `src/app/otp/page.tsx`
- [ ] Criar componente `OTPInput.tsx`
  - [ ] 6 inputs individuais
  - [ ] Auto-focus no próximo
  - [ ] Auto-submit quando completo
  - [ ] Backspace volta
  - [ ] Timer de reenvio (60s)
  - [ ] Contador de tentativas
- [ ] Mostra últimos 4 dígitos do telefone
- [ ] Botão de reenvio
- [ ] Design responsivo

### Backend (Edge Function)
- [ ] Criar `supabase/functions/validar-otp/index.ts`
  - [ ] Buscar OTP válido
  - [ ] Validar código
  - [ ] Marcar como usado
  - [ ] Atualizar device_modelo (step = 'device')
  - [ ] Gerar JWT
  - [ ] Registrar evento
- [ ] Criar `supabase/functions/reenviar-otp/index.ts`
  - [ ] Verificar rate limit
  - [ ] Gerar novo OTP
  - [ ] Enviar SMS
- [ ] Deploy das Edge Functions
- [ ] Testes de integração

---

## Fase 4: Página Device

### Frontend
- [ ] Criar página `src/app/device/page.tsx`
- [ ] Criar componente `DeviceCheck.tsx`
  - [ ] Detectar device via Client Hints API
  - [ ] Fallback para User Agent
  - [ ] Animação de "Verificando..."
  - [ ] Mostrar resultado (✓ ou ✗)
  - [ ] Mensagem de erro clara
- [ ] Criar hook `useDevice.ts`
- [ ] Design responsivo

### Backend (Edge Function)
- [ ] Criar `supabase/functions/verificar-device/index.ts`
  - [ ] Validar JWT
  - [ ] Validar step atual
  - [ ] Verificar elegibilidade (regex)
  - [ ] Atualizar device_modelo
  - [ ] Registrar evento
- [ ] Deploy da Edge Function
- [ ] Popular tabela eligible_devices
- [ ] Testes de integração

---

## Fase 5: Página Renda (Uber/99)

### Frontend
- [ ] Criar página `src/app/renda/page.tsx`
- [ ] Criar componente `RendaForm.tsx`
  - [ ] Seleção de plataforma (Uber/99)
  - [ ] Inputs de login/senha
  - [ ] Estado de loading
  - [ ] Polling de resultado
  - [ ] Progresso visual
- [ ] Criar hook `usePolling.ts`
- [ ] Design responsivo

### Backend (Edge Function)
- [ ] Criar `supabase/functions/submeter-renda/index.ts`
  - [ ] Validar JWT
  - [ ] Enfileirar job de RPA
  - [ ] Retornar job_id
- [ ] Criar `supabase/functions/status-renda/index.ts`
  - [ ] Verificar status do job
  - [ ] Se completo, processar resultado
  - [ ] Validar nome (Levenshtein)
  - [ ] Executar algoritmo de score
  - [ ] Calcular valor aprovado
  - [ ] Atualizar device_modelo
- [ ] Integração com sistema RPA existente
- [ ] Testes de integração

---

## Fase 6: Página Oferta

### Frontend
- [ ] Criar página `src/app/oferta/page.tsx`
- [ ] Criar componente `OfertaCard.tsx`
  - [ ] Mostrar valor aprovado
  - [ ] Mostrar número de parcelas
  - [ ] Mostrar valor da parcela
  - [ ] Botão "Aceitar Oferta"
  - [ ] Animação de celebração
- [ ] Design responsivo

### Backend (Edge Function)
- [ ] Criar `supabase/functions/aceitar-oferta/index.ts`
  - [ ] Validar JWT
  - [ ] Atualizar device_modelo (aprovar_plano = true)
  - [ ] Registrar evento
- [ ] Testes de integração

---

## Fase 7: Página Knox

### Frontend
- [ ] Criar página `src/app/knox/page.tsx`
- [ ] Criar componente `KnoxInstructions.tsx`
  - [ ] Instruções passo a passo
  - [ ] Link para guard.samsungknox.com
  - [ ] Input de IMEI
  - [ ] Botão "Já fiz o registro"
  - [ ] Verificação de status
- [ ] Design responsivo

### Backend (Edge Function)
- [ ] Criar `supabase/functions/verificar-knox/index.ts`
  - [ ] Validar JWT
  - [ ] Verificar enrollment Knox (API ou polling)
  - [ ] Atualizar device_modelo
  - [ ] Registrar evento
- [ ] Integração com Samsung Knox
- [ ] Testes de integração

---

## Fase 8: Página Contrato

### Frontend
- [ ] Criar página `src/app/contrato/page.tsx`
- [ ] Criar componente `ContratoViewer.tsx`
  - [ ] Visualizador de PDF
  - [ ] Checkbox de termos
  - [ ] Botão "Assinar"
  - [ ] Confirmação por OTP (opcional)
- [ ] Design responsivo

### Backend (Edge Function)
- [ ] Criar `supabase/functions/gerar-contrato/index.ts`
  - [ ] Integrar com gerador de contrato existente
  - [ ] Retornar URL do PDF
- [ ] Criar `supabase/functions/assinar-contrato/index.ts`
  - [ ] Validar JWT
  - [ ] Atualizar device_modelo (contrato_assinado = true)
  - [ ] Atualizar status = 'completed'
  - [ ] Registrar evento
- [ ] Testes de integração

---

## Fase 9: Página Sucesso

### Frontend
- [ ] Criar página `src/app/sucesso/page.tsx`
- [ ] Mensagem de conclusão
- [ ] Próximos passos
- [ ] Link para APP (opcional)
- [ ] Limpar localStorage
- [ ] Design responsivo

---

## Fase 10: Fluxos Complementares

### Acesso por Link Direto
- [ ] Criar página `src/app/j/[token]/page.tsx`
- [ ] Criar Edge Function para buscar jornada por token
- [ ] Tratar status (completed, rejected, expired)
- [ ] Redirecionar para etapa correta

### Recuperação de Sessão
- [ ] Implementar verificação de localStorage no mount
- [ ] Validar JWT no backend
- [ ] Redirecionar para etapa correta
- [ ] Tratar JWT expirado

### Rate Limiting
- [ ] Implementar rate limit de OTP (3/telefone/hora)
- [ ] Implementar rate limit de tentativas (3 erros = bloqueio)
- [ ] Implementar rate limit geral (10 req/IP/min)

---

## Fase 11: Analytics e Monitoramento

### Eventos
- [ ] Implementar log_journey_event em todas as etapas
- [ ] Criar dashboard para visualização (Supabase Studio ou custom)
- [ ] Configurar alertas para erros

### Views de Analytics
- [ ] Verificar se views estão funcionando
- [ ] Criar relatórios periódicos
- [ ] Monitorar funil de conversão

---

## Fase 12: Testes e QA

### Testes Unitários
- [ ] Testar validação de CPF
- [ ] Testar geração/validação de JWT
- [ ] Testar máscaras de input

### Testes de Integração
- [ ] Testar fluxo completo (happy path)
- [ ] Testar cenários de erro
- [ ] Testar recuperação de sessão
- [ ] Testar rate limiting

### Testes de Usabilidade
- [ ] Testar em diferentes dispositivos
- [ ] Testar em diferentes navegadores
- [ ] Testar acessibilidade
- [ ] Testar com usuários reais

### Testes de Carga
- [ ] Simular múltiplos acessos simultâneos
- [ ] Verificar performance das Edge Functions
- [ ] Verificar performance do banco

---

## Fase 13: Deploy e Go-Live

### Preparação
- [ ] Configurar domínio (credito.cashly.com.br)
- [ ] Configurar SSL
- [ ] Configurar Vercel (ou outro host)
- [ ] Configurar variáveis de ambiente em produção

### SMS
- [ ] Configurar Twilio/AWS SNS em produção
- [ ] Testar envio real de SMS
- [ ] Configurar sender ID

### Monitoramento
- [ ] Configurar Sentry para erros
- [ ] Configurar logs
- [ ] Configurar uptime monitoring

### Go-Live
- [ ] Deploy em staging
- [ ] Testes finais
- [ ] Deploy em produção
- [ ] Monitorar primeiras horas
- [ ] Coletar feedback

---

## Métricas de Sucesso

| Métrica | Meta | Atual |
|---------|------|-------|
| Taxa de conclusão (CPF → Sucesso) | > 30% | - |
| Tempo médio de jornada | < 15 min | - |
| Taxa de dropout no OTP | < 5% | - |
| Taxa de rejeição por device | < 20% | - |
| Taxa de rejeição por renda | < 30% | - |
| Taxa de aceite de oferta | > 90% | - |
| NPS da jornada | > 50 | - |

---

## Notas e Observações

### Decisões Pendentes
- [ ] _______________________________________________
- [ ] _______________________________________________

### Riscos Identificados
- [ ] _______________________________________________
- [ ] _______________________________________________

### Débitos Técnicos
- [ ] _______________________________________________
- [ ] _______________________________________________

---

## Histórico de Versões

| Data | Versão | Alterações | Responsável |
|------|--------|------------|-------------|
| | | | |
| | | | |
| | | | |
