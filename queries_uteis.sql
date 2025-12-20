-- ============================================================================
-- QUERIES SQL ÚTEIS - Jornada de Crédito Cashly
-- ============================================================================
-- Este arquivo contém queries para operação do dia a dia, análises e debug
-- ============================================================================


-- ============================================================================
-- 1. CONSULTAS DE JORNADA
-- ============================================================================

-- 1.1 Buscar jornada por CPF
SELECT 
  dm.id,
  dm.token,
  dm.jornada_step,
  dm.status,
  dm.created_at,
  dm.expires_at,
  l.nome,
  l.telefone
FROM device_modelo dm
JOIN lead l ON l.id = dm.lead_id
WHERE l.cpf = '12345678900'  -- Substituir pelo CPF
ORDER BY dm.created_at DESC
LIMIT 5;


-- 1.2 Buscar jornada por token
SELECT 
  dm.*,
  l.nome,
  l.cpf,
  l.telefone
FROM device_modelo dm
JOIN lead l ON l.id = dm.lead_id
WHERE dm.token = '550e8400-e29b-41d4-a716-446655440000';  -- Substituir pelo token


-- 1.3 Jornadas ativas (em andamento)
SELECT 
  dm.id,
  dm.token,
  dm.jornada_step,
  dm.created_at,
  dm.expires_at,
  l.nome,
  l.cpf
FROM device_modelo dm
JOIN lead l ON l.id = dm.lead_id
WHERE dm.status = 'in_progress'
  AND dm.expires_at > now()
ORDER BY dm.created_at DESC
LIMIT 50;


-- 1.4 Jornadas concluídas hoje
SELECT 
  dm.id,
  dm.token,
  dm.valor_aprovado,
  dm.completed_at,
  l.nome,
  l.cpf,
  EXTRACT(EPOCH FROM (dm.completed_at - dm.created_at)) / 60 as duracao_minutos
FROM device_modelo dm
JOIN lead l ON l.id = dm.lead_id
WHERE dm.status = 'completed'
  AND dm.completed_at::date = CURRENT_DATE
ORDER BY dm.completed_at DESC;


-- 1.5 Jornadas rejeitadas por motivo
SELECT 
  rejection_reason,
  jornada_step,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentual
FROM device_modelo
WHERE status = 'rejected'
  AND created_at > now() - interval '7 days'
GROUP BY rejection_reason, jornada_step
ORDER BY total DESC;


-- ============================================================================
-- 2. ANALYTICS E MÉTRICAS
-- ============================================================================

-- 2.1 Funil de conversão (últimos 30 dias)
SELECT * FROM v_journey_funnel;


-- 2.2 Funil de conversão por dia
SELECT 
  created_at::date as dia,
  COUNT(*) FILTER (WHERE jornada_step IN ('otp', 'device', 'uber', 'offer', 'knox', 'contract', 'completed')) as iniciaram,
  COUNT(*) FILTER (WHERE jornada_step IN ('device', 'uber', 'offer', 'knox', 'contract', 'completed')) as passaram_otp,
  COUNT(*) FILTER (WHERE jornada_step IN ('uber', 'offer', 'knox', 'contract', 'completed') AND "Aprovado CEL" = true) as device_aprovado,
  COUNT(*) FILTER (WHERE jornada_step IN ('offer', 'knox', 'contract', 'completed') AND uber = true) as renda_aprovada,
  COUNT(*) FILTER (WHERE jornada_step IN ('knox', 'contract', 'completed') AND aprovar_plano = true) as aceitaram_oferta,
  COUNT(*) FILTER (WHERE status = 'completed') as concluiram
FROM device_modelo
WHERE created_at > now() - interval '30 days'
GROUP BY created_at::date
ORDER BY dia DESC;


-- 2.3 Taxa de conversão por hora (para identificar melhores horários)
SELECT 
  EXTRACT(HOUR FROM created_at) as hora,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'completed') as concluidas,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / COUNT(*), 2) as taxa_conversao
FROM device_modelo
WHERE created_at > now() - interval '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hora;


-- 2.4 Tempo médio por etapa
SELECT * FROM v_avg_time_per_step;


-- 2.5 Performance por modelo de device
SELECT * FROM v_performance_by_device;


-- 2.6 Valor total aprovado por período
SELECT 
  DATE_TRUNC('day', completed_at) as dia,
  COUNT(*) as contratos,
  SUM(valor_aprovado) as valor_total,
  ROUND(AVG(valor_aprovado), 2) as ticket_medio
FROM device_modelo
WHERE status = 'completed'
  AND completed_at IS NOT NULL
  AND completed_at > now() - interval '30 days'
GROUP BY DATE_TRUNC('day', completed_at)
ORDER BY dia DESC;


-- ============================================================================
-- 3. DEBUG E TROUBLESHOOTING
-- ============================================================================

-- 3.1 Últimos eventos de uma jornada
SELECT 
  event_type,
  step_name,
  metadata,
  created_at
FROM journey_events
WHERE device_modelo_id = 123  -- Substituir pelo ID
ORDER BY created_at DESC
LIMIT 20;


-- 3.2 Jornadas presas em uma etapa (possível problema)
SELECT 
  dm.id,
  dm.token,
  dm.jornada_step,
  dm.created_at,
  EXTRACT(EPOCH FROM (now() - dm.created_at)) / 3600 as horas_parado,
  l.nome,
  l.telefone
FROM device_modelo dm
JOIN lead l ON l.id = dm.lead_id
WHERE dm.status = 'in_progress'
  AND dm.expires_at > now()
  AND dm.created_at < now() - interval '1 hour'  -- Parado há mais de 1 hora
ORDER BY dm.created_at ASC;


-- 3.3 OTPs enviados nas últimas horas (verificar volume de SMS)
SELECT 
  DATE_TRUNC('hour', created_at) as hora,
  COUNT(*) as otps_enviados,
  COUNT(*) FILTER (WHERE used = true) as validados,
  ROUND(100.0 * COUNT(*) FILTER (WHERE used = true) / COUNT(*), 2) as taxa_validacao
FROM otp_codes
WHERE created_at > now() - interval '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hora DESC;


-- 3.4 Tentativas de OTP com falha (possível ataque)
SELECT 
  oc.device_modelo_id,
  dm.lead_id,
  l.cpf,
  l.telefone,
  COUNT(*) as tentativas,
  MAX(oc.attempts) as max_attempts
FROM otp_codes oc
JOIN device_modelo dm ON dm.id = oc.device_modelo_id
JOIN lead l ON l.id = dm.lead_id
WHERE oc.created_at > now() - interval '1 hour'
  AND oc.used = false
GROUP BY oc.device_modelo_id, dm.lead_id, l.cpf, l.telefone
HAVING COUNT(*) > 2
ORDER BY tentativas DESC;


-- 3.5 Erros no RPA (Uber/99)
SELECT 
  je.device_modelo_id,
  je.metadata,
  je.created_at,
  dm.jornada_step,
  l.nome
FROM journey_events je
JOIN device_modelo dm ON dm.id = je.device_modelo_id
JOIN lead l ON l.id = dm.lead_id
WHERE je.event_type = 'rpa_failed'
  AND je.created_at > now() - interval '24 hours'
ORDER BY je.created_at DESC;


-- ============================================================================
-- 4. OPERAÇÕES DE MANUTENÇÃO
-- ============================================================================

-- 4.1 Expirar jornadas abandonadas
UPDATE device_modelo
SET status = 'expired'
WHERE status = 'in_progress'
  AND expires_at < now();


-- 4.2 Limpar OTPs expirados (manter últimos 7 dias para auditoria)
DELETE FROM otp_codes
WHERE expires_at < now() - interval '7 days';


-- 4.3 Reativar jornada (caso especial, usar com cuidado)
UPDATE device_modelo
SET 
  status = 'in_progress',
  expires_at = now() + interval '24 hours'
WHERE id = 123;  -- Substituir pelo ID


-- 4.4 Adicionar novo device elegível
INSERT INTO eligible_devices (brand, model_pattern, min_year, description)
VALUES ('Samsung', '^SM-A[0-9]{3}', 2023, 'Samsung Galaxy A (2023+)');


-- 4.5 Desativar device da lista de elegíveis
UPDATE eligible_devices
SET active = false
WHERE model_pattern = '^SM-A[5-7][0-9]';


-- ============================================================================
-- 5. RELATÓRIOS GERENCIAIS
-- ============================================================================

-- 5.1 Resumo diário
SELECT 
  DATE_TRUNC('day', created_at) as dia,
  COUNT(*) as jornadas_iniciadas,
  COUNT(*) FILTER (WHERE status = 'completed') as concluidas,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejeitadas,
  COUNT(*) FILTER (WHERE status = 'expired') as expiradas,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 2) as taxa_conversao,
  SUM(valor_aprovado) FILTER (WHERE status = 'completed') as valor_total_aprovado,
  ROUND(AVG(valor_aprovado) FILTER (WHERE status = 'completed'), 2) as ticket_medio
FROM device_modelo
WHERE created_at > now() - interval '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY dia DESC;


-- 5.2 Comparativo semanal
WITH semanas AS (
  SELECT 
    DATE_TRUNC('week', created_at) as semana,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'completed') as concluidas,
    SUM(valor_aprovado) FILTER (WHERE status = 'completed') as valor
  FROM device_modelo
  WHERE created_at > now() - interval '8 weeks'
  GROUP BY DATE_TRUNC('week', created_at)
)
SELECT 
  semana,
  total,
  concluidas,
  valor,
  ROUND(100.0 * (total - LAG(total) OVER (ORDER BY semana)) / NULLIF(LAG(total) OVER (ORDER BY semana), 0), 2) as variacao_total,
  ROUND(100.0 * (concluidas - LAG(concluidas) OVER (ORDER BY semana)) / NULLIF(LAG(concluidas) OVER (ORDER BY semana), 0), 2) as variacao_concluidas
FROM semanas
ORDER BY semana DESC;


-- 5.3 Top motivos de rejeição
SELECT 
  CASE rejection_reason
    WHEN 'device_not_eligible' THEN 'Device não elegível'
    WHEN 'income_insufficient' THEN 'Renda insuficiente'
    WHEN 'name_mismatch' THEN 'Nome não confere'
    WHEN 'blacklisted' THEN 'Cliente bloqueado'
    ELSE COALESCE(rejection_reason, 'Não especificado')
  END as motivo,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentual
FROM device_modelo
WHERE status = 'rejected'
  AND created_at > now() - interval '30 days'
GROUP BY rejection_reason
ORDER BY total DESC;


-- 5.4 Distribuição de valores aprovados
SELECT 
  CASE 
    WHEN valor_aprovado < 500 THEN 'Até R$ 500'
    WHEN valor_aprovado < 1000 THEN 'R$ 500 - R$ 1.000'
    WHEN valor_aprovado < 2000 THEN 'R$ 1.000 - R$ 2.000'
    WHEN valor_aprovado < 5000 THEN 'R$ 2.000 - R$ 5.000'
    ELSE 'Acima de R$ 5.000'
  END as faixa,
  COUNT(*) as quantidade,
  SUM(valor_aprovado) as valor_total,
  ROUND(AVG(valor_aprovado), 2) as valor_medio
FROM device_modelo
WHERE status = 'completed'
  AND valor_aprovado IS NOT NULL
  AND created_at > now() - interval '30 days'
GROUP BY 
  CASE 
    WHEN valor_aprovado < 500 THEN 'Até R$ 500'
    WHEN valor_aprovado < 1000 THEN 'R$ 500 - R$ 1.000'
    WHEN valor_aprovado < 2000 THEN 'R$ 1.000 - R$ 2.000'
    WHEN valor_aprovado < 5000 THEN 'R$ 2.000 - R$ 5.000'
    ELSE 'Acima de R$ 5.000'
  END
ORDER BY valor_medio;


-- ============================================================================
-- 6. MONITORAMENTO EM TEMPO REAL
-- ============================================================================

-- 6.1 Jornadas iniciadas nos últimos 15 minutos
SELECT 
  dm.id,
  dm.jornada_step,
  dm.created_at,
  l.nome,
  EXTRACT(EPOCH FROM (now() - dm.created_at)) / 60 as minutos_atras
FROM device_modelo dm
JOIN lead l ON l.id = dm.lead_id
WHERE dm.created_at > now() - interval '15 minutes'
ORDER BY dm.created_at DESC;


-- 6.2 Alertas: Jornadas paradas há muito tempo
SELECT 
  'ALERTA: Jornada ' || dm.id || ' parada em ' || dm.jornada_step || ' há ' || 
  ROUND(EXTRACT(EPOCH FROM (now() - dm.created_at)) / 60) || ' minutos' as alerta,
  l.nome,
  l.telefone
FROM device_modelo dm
JOIN lead l ON l.id = dm.lead_id
WHERE dm.status = 'in_progress'
  AND dm.created_at < now() - interval '30 minutes'
  AND dm.expires_at > now();


-- 6.3 Volume em tempo real (última hora)
SELECT 
  DATE_TRUNC('minute', created_at) as minuto,
  COUNT(*) as jornadas
FROM device_modelo
WHERE created_at > now() - interval '1 hour'
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY minuto DESC;
