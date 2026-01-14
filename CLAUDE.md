# CLAUDE.md - Nova Jornada

> Jornada de aprovacao de credito 100% web para motoristas Uber/99

## Visao Geral

**Nome:** Nova Jornada (Cashly Credit Journey)
**Descricao:** Aplicacao web mobile-first para aprovacao rapida de credito (~5-10 minutos) para motoristas de aplicativo
**Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, Supabase
**Repositorio:** Nova Jornada

## Contexto

- **Responsavel:** Equipe Cashly
- **Comunicacao:** Portugues brasileiro, tecnico
- **Nivel tecnico:** Avancado (React, TypeScript, APIs REST)

## Estrutura do Projeto

```
/
├── src/
│   ├── app/                    # Next.js App Router (paginas e API)
│   │   ├── api/               # Rotas de API (backend)
│   │   │   ├── otp/          # Envio e verificacao de OTP
│   │   │   ├── device/       # Validacao de dispositivo
│   │   │   ├── journey/      # Gerenciamento da jornada
│   │   │   └── heartbeat/    # Keep-alive da sessao
│   │   ├── credito/          # Paginas da jornada (steps 01-07)
│   │   ├── cadastro/         # Cadastro de novo cliente
│   │   └── admin/            # Painel administrativo
│   ├── components/            # Componentes React reutilizaveis
│   ├── hooks/                 # Custom hooks (sessao, tracking, eventos)
│   ├── lib/                   # Bibliotecas utilitarias (supabase, sms, cep)
│   ├── store/                 # Estado global (Zustand)
│   ├── types/                 # Definicoes TypeScript
│   ├── schemas/               # Schemas de validacao (Zod)
│   └── utils/                 # Funcoes utilitarias (validadores)
├── public/                    # Assets estaticos
├── docs/                      # Documentacao detalhada
└── supabase/                  # Configuracao Supabase
```

## Documentacao de Apoio

Para tarefas especificas, **consulte o arquivo correspondente antes de executar**:

| Area | Arquivo | Quando Consultar |
|------|---------|------------------|
| Deploy | [docs/DEPLOY.md](docs/DEPLOY.md) | Publicacao, CI/CD, ambientes |
| Arquitetura | [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | Padroes, decisoes tecnicas |
| Backend/API | [docs/BACKEND.md](docs/BACKEND.md) | Endpoints, banco de dados |
| Frontend | [docs/FRONTEND.md](docs/FRONTEND.md) | Componentes, rotas, estado |
| Identidade Visual | [docs/IDENTIDADE_VISUAL.md](docs/IDENTIDADE_VISUAL.md) | Cores, fontes, espacamentos |
| Testes | [docs/TESTES.md](docs/TESTES.md) | Como testar, cobertura |
| Seguranca | [docs/SEGURANCA.md](docs/SEGURANCA.md) | Auth, permissoes |
| Device Detection | [docs/DEVICE_DETECTION.md](docs/DEVICE_DETECTION.md) | Camadas de deteccao, 51Degrees |

## Comandos Essenciais

```bash
npm run dev      # Iniciar servidor de desenvolvimento (porta 4500)
npm run build    # Build para producao
npm run start    # Iniciar servidor de producao (porta 4500)
npm run lint     # Verificar codigo com ESLint
```

## Regras Criticas

1. **Mobile-only**: Aplicacao restrita a dispositivos moveis (MobileOnly wrapper)
2. **OTP expira em 20 minutos**: Validacao requer re-autenticacao apos expiracao
3. **Fluxo sequencial**: Usuario nao pode pular steps (SessionGuard bloqueia acesso)
4. **Nunca armazenar OTP em texto plano**: Usar hash SHA-256
5. **Beacon API para eventos**: Garantir entrega mesmo ao fechar pagina

## Padroes de Codigo

- **Nomenclatura:** camelCase para variaveis/funcoes, PascalCase para componentes
- **Commits:** Convencional (feat:, fix:, refactor:, docs:)
- **Branches:** feature/*, fix/*, refactor/*

## Fluxo da Jornada

```
/ (Step 00)        → Entrada CPF
/cadastro (00b)    → Cadastro novo cliente
/credito/otp (01)  → Verificacao OTP
/credito/device (02) → Elegibilidade do dispositivo
/credito/renda (03)  → Verificacao de renda (Uber/99)
/credito/oferta (04) → Exibicao da oferta
/credito/knox (05)   → Registro Samsung Knox
/credito/contrato (06) → Assinatura do contrato
/credito/sucesso (07)  → Confirmacao de sucesso
```

## Problemas Conhecidos

- [ ] CI/CD nao configurado (deploy manual)
- [ ] Testes automatizados nao implementados
- [ ] Dark mode nao disponivel

## Notas para o Claude

- Sempre validar se OTP ainda esta valido (< 20 minutos) antes de operacoes
- Usar `useJourneyStore()` para acessar estado global da jornada
- Preferir Beacon API para tracking de eventos (garante entrega)
- Verificar `useHydration()` antes de acessar estado persistido
- Steps sao strings ('00', '01', '02'...) nao numeros
- Rotas de API retornam JSON com formato `{ success, data?, error? }`

---

*Ultima atualizacao: 2025-01-14*
