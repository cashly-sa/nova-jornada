# DEPLOY.md - Publicacao e Ambientes

> Configuracao de ambientes e processo de deploy

## Ambientes

### Desenvolvimento
- **URL:** http://localhost:4500
- **Banco:** Supabase (projeto de desenvolvimento)
- **Variaveis:** `.env.local`

### Staging
(SEM INFORMACAO DE CONTEXTO - nao configurado)

### Producao
(SEM INFORMACAO DE CONTEXTO - nao configurado)

**Recomendacao:** Vercel para deploy automatico com Next.js

## Processo de Deploy

### Para Desenvolvimento

```bash
# Instalar dependencias
npm install

# Criar arquivo de variaveis
cp .env.example .env.local
# Editar .env.local com credenciais reais

# Iniciar servidor
npm run dev
```

### Para Producao

(SEM INFORMACAO DE CONTEXTO)

**Recomendacao com Vercel:**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy para producao
vercel --prod
```

## CI/CD

(SEM INFORMACAO DE CONTEXTO - nao ha .github/workflows configurado)

**Recomendacao GitHub Actions:**
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run lint
      # Adicionar step de deploy para Vercel
```

## Variaveis de Ambiente

### Desenvolvimento (.env.local)
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

### Staging
(SEM INFORMACAO DE CONTEXTO)

### Producao
(SEM INFORMACAO DE CONTEXTO)

**Recomendacao:** Configurar no dashboard Vercel em Settings > Environment Variables

## Rollback

(SEM INFORMACAO DE CONTEXTO)

**Recomendacao com Vercel:**
```bash
# Listar deployments
vercel ls

# Promover deployment anterior para producao
vercel promote [deployment-url]
```

## Migrations

### Supabase
```bash
# Aplicar migrations (via Supabase CLI)
supabase db push

# Ou executar SQL diretamente no dashboard Supabase
# Arquivo: migrations.sql
```

### Arquivo de Migrations
O schema do banco esta documentado em `migrations.sql` na raiz do projeto.

## Checklist Pre-Deploy

- [ ] Verificar `.env.local` nao esta no git
- [ ] Rodar `npm run build` localmente sem erros
- [ ] Rodar `npm run lint` sem erros
- [ ] Testar fluxo completo em desenvolvimento
- [ ] Verificar variaveis de ambiente no destino
- [ ] Confirmar migrations aplicadas no banco

## Scripts Disponiveis

```bash
npm run dev      # Servidor de desenvolvimento (porta 4500)
npm run build    # Build para producao
npm run start    # Servidor de producao (porta 4500)
npm run lint     # Verificar codigo com ESLint
```

## Portas

| Ambiente | Porta |
|----------|-------|
| Desenvolvimento | 4500 |
| Producao | 4500 (ou definida pelo host) |

## Troubleshooting

### Build falha com erro de tipo
```bash
# Verificar erros de TypeScript
npx tsc --noEmit
```

### Erro de conexao com Supabase
1. Verificar NEXT_PUBLIC_SUPABASE_URL esta correta
2. Verificar NEXT_PUBLIC_SUPABASE_ANON_KEY esta correta
3. Verificar RLS policies no Supabase

### SMS nao esta sendo enviado
1. Verificar CLICKSEND_USERNAME esta correto
2. Verificar CLICKSEND_API_KEY esta correto
3. Verificar saldo na conta ClickSend
4. Verificar logs no console (modo dev mostra codigo OTP)

### Variaveis de ambiente nao carregam
1. Verificar arquivo `.env.local` existe
2. Variaves publicas devem comecar com `NEXT_PUBLIC_`
3. Reiniciar servidor apos alterar `.env.local`

---

*Ultima atualizacao: 2025-12-22*
