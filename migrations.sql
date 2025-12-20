-- ============================================================================
-- MIGRATION: Jornada de Crédito Cashly
-- Versão: 1.0
-- Data: Dezembro 2024
-- ============================================================================

-- ============================================================================
-- IMPORTANTE: A tabela LEAD não é alterada!
-- Apenas consultamos: id, cpf, telefone, nome, "Blacklist", fcm_token
-- ============================================================================


-- ============================================================================
-- 1. ALTERAÇÕES NA TABELA device_modelo
-- ============================================================================

-- 1.1 Token único para URL da jornada
ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS token uuid UNIQUE DEFAULT gen_random_uuid();

-- 1.2 Etapa atual da jornada (mais semântico que boolean)
ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS jornada_step text DEFAULT 'inicio';

-- 1.3 Status geral da jornada
ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'in_progress';

-- 1.4 Timestamps de cada etapa (para analytics de tempo)
ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS otp_verified_at timestamptz;

ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS device_checked_at timestamptz;

ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS uber_checked_at timestamptz;

ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS offer_shown_at timestamptz;

ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS offer_accepted_at timestamptz;

ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS knox_enrolled_at timestamptz;

ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz;

ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 1.5 Dados da validação Uber/99 (JSONB para flexibilidade)
ALTER TABLE public.device_modelo
ADD COLUMN IF NOT EXISTS dados_uber jsonb;

ALTER TABLE public.device_modelo
ADD COLUMN IF NOT EXISTS dados_99 jsonb;

-- 1.5.1 Plataforma escolhida pelo usuário (uber ou 99)
ALTER TABLE public.device_modelo
ADD COLUMN IF NOT EXISTS plataforma_escolhida text;

-- 1.6 Score calculado pelo algoritmo
ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS score_credito numeric;

-- 1.7 Motivo de rejeição (para analytics)
ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 1.8 Knox IMEI
ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS knox_imei text;

-- 1.9 Contrato
ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS contrato_id uuid;

ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS contrato_assinado boolean DEFAULT false;

-- 1.10 Expiração da jornada (24h após início)
ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '24 hours');

-- 1.11 IP e User Agent (segurança/auditoria)
ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS ip_address inet;

ALTER TABLE public.device_modelo 
ADD COLUMN IF NOT EXISTS user_agent text;


-- ============================================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Busca por token (URL da jornada)
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_modelo_token 
ON public.device_modelo(token);

-- Busca de jornadas ativas por lead
CREATE INDEX IF NOT EXISTS idx_device_modelo_lead_active 
ON public.device_modelo(lead_id, status, created_at DESC)
WHERE status = 'in_progress';

-- Analytics por etapa
CREATE INDEX IF NOT EXISTS idx_device_modelo_step 
ON public.device_modelo(jornada_step, status);

-- Analytics por modelo de device
CREATE INDEX IF NOT EXISTS idx_device_modelo_modelo_status 
ON public.device_modelo(modelo, status);

-- Busca por status e expiração
CREATE INDEX IF NOT EXISTS idx_device_modelo_status_expires 
ON public.device_modelo(status, expires_at)
WHERE status = 'in_progress';


-- ============================================================================
-- 3. TABELA: otp_codes (códigos SMS temporários)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_modelo_id bigint NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  used boolean NOT NULL DEFAULT false,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT otp_codes_device_modelo_fkey 
    FOREIGN KEY (device_modelo_id) 
    REFERENCES public.device_modelo(id) 
    ON DELETE CASCADE
);

-- Índice para busca de OTP válido
CREATE INDEX IF NOT EXISTS idx_otp_codes_valid 
ON public.otp_codes(device_modelo_id, used, expires_at)
WHERE used = false;

-- Índice para limpeza de expirados
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires 
ON public.otp_codes(expires_at)
WHERE used = false;

-- Comentário na tabela
COMMENT ON TABLE public.otp_codes IS 'Códigos OTP temporários para autenticação na jornada de crédito';


-- ============================================================================
-- 4. TABELA: journey_events (analytics de dropout)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.journey_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_modelo_id bigint NOT NULL,
  event_type text NOT NULL,
  step_name text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT journey_events_device_modelo_fkey 
    FOREIGN KEY (device_modelo_id) 
    REFERENCES public.device_modelo(id) 
    ON DELETE CASCADE
);

-- Índice para busca por jornada
CREATE INDEX IF NOT EXISTS idx_journey_events_device 
ON public.journey_events(device_modelo_id);

-- Índice para analytics
CREATE INDEX IF NOT EXISTS idx_journey_events_analytics 
ON public.journey_events(event_type, step_name, created_at);

-- Índice para relatórios por período
CREATE INDEX IF NOT EXISTS idx_journey_events_created 
ON public.journey_events(created_at);

-- Comentário na tabela
COMMENT ON TABLE public.journey_events IS 'Eventos da jornada para analytics de dropout e conversão';


-- ============================================================================
-- 5. TABELA: eligible_devices (lista de devices aceitos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.eligible_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model_pattern text NOT NULL,
  min_year int,
  min_android_version text,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para busca de devices ativos
CREATE INDEX IF NOT EXISTS idx_eligible_devices_active 
ON public.eligible_devices(active) 
WHERE active = true;

-- Comentário na tabela
COMMENT ON TABLE public.eligible_devices IS 'Lista de modelos de dispositivos elegíveis para crédito';

-- Dados iniciais de devices Samsung
INSERT INTO public.eligible_devices (brand, model_pattern, min_year, description) VALUES
  ('Samsung', '^SM-S9[0-9]{2}', 2021, 'Samsung Galaxy S21/S22/S23/S24'),
  ('Samsung', '^SM-S8[0-9]{2}', 2020, 'Samsung Galaxy S20'),
  ('Samsung', '^SM-G99[0-9]', 2021, 'Samsung Galaxy S21 FE'),
  ('Samsung', '^SM-A[5-7][0-9]', 2022, 'Samsung Galaxy A50-A70 (2022+)'),
  ('Samsung', '^SM-F9[0-9]{2}', 2021, 'Samsung Galaxy Z Fold/Flip'),
  ('Samsung', '^SM-N9[0-9]{2}', 2020, 'Samsung Galaxy Note 20'),
  ('Samsung', '^SM-A1[3-5][0-9]', 2022, 'Samsung Galaxy A13/A14/A15'),
  ('Samsung', '^SM-A2[3-5][0-9]', 2022, 'Samsung Galaxy A23/A24/A25'),
  ('Samsung', '^SM-A3[3-5][0-9]', 2022, 'Samsung Galaxy A33/A34/A35'),
  ('Samsung', '^SM-A5[3-5][0-9]', 2022, 'Samsung Galaxy A53/A54/A55')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 6. FUNÇÕES AUXILIARES
-- ============================================================================

-- 6.1 Função para buscar ou criar jornada
CREATE OR REPLACE FUNCTION get_or_create_journey(
  p_lead_id smallint,
  p_ip inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS TABLE (
  journey_id bigint,
  journey_token uuid,
  current_step text,
  is_new boolean
) AS $$
DECLARE
  v_existing record;
  v_new record;
BEGIN
  -- Busca jornada ativa existente
  SELECT id, token, jornada_step INTO v_existing
  FROM device_modelo
  WHERE lead_id = p_lead_id
    AND status = 'in_progress'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_existing.id IS NOT NULL THEN
    -- Retorna jornada existente
    RETURN QUERY SELECT v_existing.id, v_existing.token, v_existing.jornada_step, false;
  ELSE
    -- Cria nova jornada
    INSERT INTO device_modelo (lead_id, jornada_step, status, ip_address, user_agent)
    VALUES (p_lead_id, 'otp', 'in_progress', p_ip, p_user_agent)
    RETURNING id, token, device_modelo.jornada_step INTO v_new;
    
    RETURN QUERY SELECT v_new.id, v_new.token, v_new.jornada_step, true;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_or_create_journey IS 'Busca jornada ativa do lead ou cria uma nova';


-- 6.2 Função para verificar elegibilidade do device
CREATE OR REPLACE FUNCTION check_device_eligibility(p_model text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM eligible_devices
    WHERE active = true
      AND p_model ~ model_pattern
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_device_eligibility IS 'Verifica se o modelo do device é elegível para crédito';


-- 6.3 Função para registrar evento da jornada
CREATE OR REPLACE FUNCTION log_journey_event(
  p_device_modelo_id bigint,
  p_event_type text,
  p_step_name text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO journey_events (device_modelo_id, event_type, step_name, metadata)
  VALUES (p_device_modelo_id, p_event_type, p_step_name, p_metadata)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_journey_event IS 'Registra evento para analytics da jornada';


-- 6.4 Função para atualizar etapa da jornada
CREATE OR REPLACE FUNCTION update_journey_step(
  p_journey_id bigint,
  p_step text,
  p_status text DEFAULT 'in_progress'
)
RETURNS void AS $$
BEGIN
  UPDATE device_modelo
  SET 
    jornada_step = p_step,
    status = p_status,
    -- Atualiza timestamp específico da etapa
    otp_verified_at = CASE WHEN p_step = 'device' AND otp_verified_at IS NULL THEN now() ELSE otp_verified_at END,
    device_checked_at = CASE WHEN p_step IN ('uber', 'rejected') AND device_checked_at IS NULL THEN now() ELSE device_checked_at END,
    uber_checked_at = CASE WHEN p_step = 'offer' AND uber_checked_at IS NULL THEN now() ELSE uber_checked_at END,
    offer_shown_at = CASE WHEN p_step = 'offer' AND offer_shown_at IS NULL THEN now() ELSE offer_shown_at END,
    offer_accepted_at = CASE WHEN p_step = 'knox' AND offer_accepted_at IS NULL THEN now() ELSE offer_accepted_at END,
    knox_enrolled_at = CASE WHEN p_step = 'contract' AND knox_enrolled_at IS NULL THEN now() ELSE knox_enrolled_at END,
    contract_signed_at = CASE WHEN p_step = 'completed' AND contract_signed_at IS NULL THEN now() ELSE contract_signed_at END,
    completed_at = CASE WHEN p_status = 'completed' AND completed_at IS NULL THEN now() ELSE completed_at END
  WHERE id = p_journey_id;
  
  -- Registra evento
  PERFORM log_journey_event(
    p_journey_id, 
    CASE WHEN p_status = 'rejected' THEN 'step_failed' ELSE 'step_completed' END,
    p_step
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_journey_step IS 'Atualiza etapa da jornada e registra evento';


-- ============================================================================
-- 7. VIEWS PARA ANALYTICS
-- ============================================================================

-- 7.1 Funil de conversão por etapa
CREATE OR REPLACE VIEW v_journey_funnel AS
SELECT 
  jornada_step,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE status = 'expired') as expired,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 2) as completion_rate_pct
FROM device_modelo
WHERE created_at > now() - interval '30 days'
GROUP BY jornada_step
ORDER BY 
  CASE jornada_step
    WHEN 'inicio' THEN 1
    WHEN 'otp' THEN 2
    WHEN 'device' THEN 3
    WHEN 'uber' THEN 4
    WHEN 'offer' THEN 5
    WHEN 'knox' THEN 6
    WHEN 'contract' THEN 7
    WHEN 'completed' THEN 8
    WHEN 'rejected' THEN 9
    ELSE 10
  END;

COMMENT ON VIEW v_journey_funnel IS 'Funil de conversão da jornada nos últimos 30 dias';


-- 7.2 Dropout por etapa
CREATE OR REPLACE VIEW v_dropout_by_step AS
WITH step_counts AS (
  SELECT 
    jornada_step,
    COUNT(*) as entered,
    COUNT(*) FILTER (WHERE status = 'in_progress' AND expires_at < now()) as abandoned,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected
  FROM device_modelo
  WHERE created_at > now() - interval '30 days'
  GROUP BY jornada_step
)
SELECT 
  jornada_step,
  entered,
  abandoned,
  rejected,
  ROUND(100.0 * abandoned / NULLIF(entered, 0), 2) as abandonment_rate_pct,
  ROUND(100.0 * rejected / NULLIF(entered, 0), 2) as rejection_rate_pct
FROM step_counts
ORDER BY 
  CASE jornada_step
    WHEN 'inicio' THEN 1
    WHEN 'otp' THEN 2
    WHEN 'device' THEN 3
    WHEN 'uber' THEN 4
    WHEN 'offer' THEN 5
    WHEN 'knox' THEN 6
    WHEN 'contract' THEN 7
    ELSE 10
  END;

COMMENT ON VIEW v_dropout_by_step IS 'Taxa de abandono e rejeição por etapa';


-- 7.3 Tempo médio por etapa
CREATE OR REPLACE VIEW v_avg_time_per_step AS
SELECT 
  'otp' as step,
  ROUND(AVG(EXTRACT(EPOCH FROM (otp_verified_at - created_at)) / 60), 2) as avg_minutes
FROM device_modelo
WHERE otp_verified_at IS NOT NULL
  AND created_at > now() - interval '30 days'
UNION ALL
SELECT 
  'device' as step,
  ROUND(AVG(EXTRACT(EPOCH FROM (device_checked_at - otp_verified_at)) / 60), 2) as avg_minutes
FROM device_modelo
WHERE device_checked_at IS NOT NULL
  AND otp_verified_at IS NOT NULL
  AND created_at > now() - interval '30 days'
UNION ALL
SELECT 
  'uber' as step,
  ROUND(AVG(EXTRACT(EPOCH FROM (uber_checked_at - device_checked_at)) / 60), 2) as avg_minutes
FROM device_modelo
WHERE uber_checked_at IS NOT NULL
  AND device_checked_at IS NOT NULL
  AND created_at > now() - interval '30 days'
UNION ALL
SELECT 
  'offer_to_accept' as step,
  ROUND(AVG(EXTRACT(EPOCH FROM (offer_accepted_at - offer_shown_at)) / 60), 2) as avg_minutes
FROM device_modelo
WHERE offer_accepted_at IS NOT NULL
  AND offer_shown_at IS NOT NULL
  AND created_at > now() - interval '30 days'
UNION ALL
SELECT 
  'knox' as step,
  ROUND(AVG(EXTRACT(EPOCH FROM (knox_enrolled_at - offer_accepted_at)) / 60), 2) as avg_minutes
FROM device_modelo
WHERE knox_enrolled_at IS NOT NULL
  AND offer_accepted_at IS NOT NULL
  AND created_at > now() - interval '30 days'
UNION ALL
SELECT 
  'contract' as step,
  ROUND(AVG(EXTRACT(EPOCH FROM (contract_signed_at - knox_enrolled_at)) / 60), 2) as avg_minutes
FROM device_modelo
WHERE contract_signed_at IS NOT NULL
  AND knox_enrolled_at IS NOT NULL
  AND created_at > now() - interval '30 days'
UNION ALL
SELECT 
  'total' as step,
  ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60), 2) as avg_minutes
FROM device_modelo
WHERE completed_at IS NOT NULL
  AND created_at > now() - interval '30 days';

COMMENT ON VIEW v_avg_time_per_step IS 'Tempo médio em minutos em cada etapa';


-- 7.4 Performance por modelo de device
CREATE OR REPLACE VIEW v_performance_by_device AS
SELECT 
  modelo,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE "Aprovado CEL" = true) as device_approved,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE "Aprovado CEL" = true) / NULLIF(COUNT(*), 0), 2) as device_approval_rate_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 2) as completion_rate_pct
FROM device_modelo
WHERE modelo IS NOT NULL
  AND created_at > now() - interval '30 days'
GROUP BY modelo
ORDER BY total_attempts DESC;

COMMENT ON VIEW v_performance_by_device IS 'Taxa de aprovação e conversão por modelo de device';


-- ============================================================================
-- 8. POLÍTICAS DE SEGURANÇA (RLS)
-- ============================================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligible_devices ENABLE ROW LEVEL SECURITY;

-- Política: Apenas service_role pode acessar otp_codes
CREATE POLICY "Service role only" ON public.otp_codes
  FOR ALL USING (auth.role() = 'service_role');

-- Política: Apenas service_role pode acessar journey_events
CREATE POLICY "Service role only" ON public.journey_events
  FOR ALL USING (auth.role() = 'service_role');

-- Política: Leitura pública de eligible_devices (para cache no frontend)
CREATE POLICY "Public read" ON public.eligible_devices
  FOR SELECT USING (true);

-- Política: Apenas service_role pode modificar eligible_devices
CREATE POLICY "Service role write" ON public.eligible_devices
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- 9. TRIGGER: Atualizar updated_at em eligible_devices
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_eligible_devices_updated_at ON public.eligible_devices;
CREATE TRIGGER trigger_eligible_devices_updated_at
  BEFORE UPDATE ON public.eligible_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 10. TRIGGER: Expirar jornadas abandonadas (opcional - usar com pg_cron)
-- ============================================================================

-- Se estiver usando pg_cron, pode agendar:
-- SELECT cron.schedule('expire-journeys', '0 * * * *', 
--   $$UPDATE device_modelo SET status = 'expired' WHERE status = 'in_progress' AND expires_at < now()$$
-- );


-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
