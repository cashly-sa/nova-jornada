# Migrations - Jornada de Crédito Cashly

## Como Executar

As migrations estão no arquivo `migrations.sql` na raiz do projeto.

### Passo 1: Executar migrations principais
Execute o arquivo `migrations.sql` no Supabase SQL Editor:

```sql
-- Copie e cole o conteúdo de migrations.sql
```

### Passo 2: Importar dispositivos do CSV
Após criar a estrutura, execute o script para importar os dispositivos do CSV `de_para devices.csv`.

**Opção A - Via Supabase Dashboard:**
1. Vá em Table Editor > eligible_devices
2. Use "Import from CSV"
3. Selecione o arquivo `de_para devices.csv`

**Opção B - Via Script SQL:**
Use o arquivo `004_import_devices.sql` nesta pasta.

## Estrutura Criada

### Alterações em device_modelo
- `token` (UUID) - Identificador único para URL
- `jornada_step` - Etapa atual
- `status` - in_progress, completed, rejected, expired
- Timestamps de cada etapa
- `dados_uber`, `dados_99` (JSONB)
- `score_credito`, `rejection_reason`
- `knox_imei`, `contrato_id`
- `ip_address`, `user_agent`

### Novas Tabelas
- `otp_codes` - Códigos OTP temporários
- `journey_events` - Analytics de eventos
- `eligible_devices` - Dispositivos elegíveis

### Views de Analytics
- `v_journey_funnel` - Funil de conversão
- `v_dropout_by_step` - Taxa de abandono
- `v_avg_time_per_step` - Tempo médio por etapa
- `v_performance_by_device` - Performance por modelo

## Rollback

Para reverter as alterações, execute:

```sql
-- Remover views
DROP VIEW IF EXISTS v_journey_funnel;
DROP VIEW IF EXISTS v_dropout_by_step;
DROP VIEW IF EXISTS v_avg_time_per_step;
DROP VIEW IF EXISTS v_performance_by_device;

-- Remover tabelas
DROP TABLE IF EXISTS otp_codes;
DROP TABLE IF EXISTS journey_events;
DROP TABLE IF EXISTS eligible_devices;

-- Remover colunas de device_modelo (CUIDADO!)
-- ALTER TABLE device_modelo DROP COLUMN IF EXISTS token;
-- ... (demais colunas)
```
