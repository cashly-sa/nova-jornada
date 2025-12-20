# 📱 Jornada de Crédito Cashly

> Sistema de avaliação e concessão de crédito 100% web, sem fricção.

---

## 🎯 Objetivo

Substituir o fluxo atual (cliente baixa APP para saber se é elegível) por uma jornada web contínua, rápida e sem fricção.

---

## 📁 Documentação

| Arquivo | Descrição |
|---------|-----------|
| [Arquitetura.md](./Arquitetura.md) | Visão geral, decisões técnicas, modelo de dados |
| [fluxos.md](./fluxos.md) | Diagramas detalhados de cada fluxo |
| [prompt_claude_code.md](./prompt_claude_code.md) | Prompt completo para implementação no VS Code |
| [migrations.sql](./migrations.sql) | Scripts SQL para criação das tabelas |
| [checklist_implementacao.md](./checklist_implementacao.md) | Checklist de tarefas para acompanhamento |

---

## 🚀 Quick Start

### 1. Executar Migrations no Supabase

```bash
# Copie o conteúdo de migrations.sql e execute no Supabase SQL Editor
```

### 2. Iniciar Desenvolvimento

```bash
# Copie o conteúdo de prompt_claude_code.md para o Claude Code no VS Code
# e peça para criar o projeto
```

### 3. Acompanhar Progresso

```bash
# Use o checklist_implementacao.md para marcar as tarefas concluídas
```

---

## 📊 Resumo da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   LEAD (dados cadastrais)                                       │
│      │                                                          │
│      │ 1:N                                                      │
│      ▼                                                          │
│   DEVICE_MODELO (jornadas de crédito)                          │
│      │                                                          │
│      ├── OTP_CODES (códigos SMS)                               │
│      │                                                          │
│      └── JOURNEY_EVENTS (analytics)                            │
│                                                                 │
│   ELIGIBLE_DEVICES (lista de devices aceitos)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo da Jornada

```
CPF → OTP → Device → Renda → Oferta → Knox → Contrato → ✅
```

1. **CPF**: Cliente digita CPF, sistema busca lead e envia OTP
2. **OTP**: Cliente valida código SMS
3. **Device**: Sistema verifica se celular é elegível
4. **Renda**: RPA coleta dados do Uber/99, algoritmo calcula score
5. **Oferta**: Sistema apresenta valor aprovado
6. **Knox**: Cliente registra device no Samsung Knox
7. **Contrato**: Cliente assina contrato digital
8. **Sucesso**: Crédito liberado!

---

## 🔐 Segurança

- Autenticação por OTP SMS (sem senha)
- JWT com expiração de 2h
- Rate limiting em todas as etapas
- Dados sensíveis criptografados
- CPF nunca salvo em logs

---

## 📈 Analytics

Views disponíveis no Supabase:

- `v_journey_funnel` - Funil de conversão
- `v_dropout_by_step` - Taxa de abandono por etapa
- `v_avg_time_per_step` - Tempo médio em cada etapa
- `v_performance_by_device` - Performance por modelo de device

---

## 🛠 Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 14 (App Router) |
| UI | Tailwind CSS + Shadcn/ui |
| Estado | Zustand + JWT |
| Backend | Supabase Edge Functions |
| Database | Supabase PostgreSQL |
| SMS | Twilio |

---

## 📝 Changelog

| Data | Versão | Descrição |
|------|--------|-----------|
| Dez/24 | 1.0 | Documentação inicial |

---

## 👥 Contato

- **Projeto**: Jornada de Crédito
- **Equipe**: _________________
- **Data**: Dezembro 2024
