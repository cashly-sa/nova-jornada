-- ============================================================================
-- Migration: 005_idempotency.sql
-- Descrição: Correções de idempotência para OTP e device validation
-- Data: 2025-12-20
-- ============================================================================

-- ============================================================================
-- 1. ÍNDICE UNIQUE PARA OTP
-- Garante que só existe 1 OTP não-usado por jornada
-- Nota: Não podemos usar NOW() no índice (não é IMMUTABLE)
--       A verificação de expiração é feita no código/função
-- ============================================================================

-- Primeiro, invalida OTPs duplicados existentes (mantém apenas o mais recente)
UPDATE otp_codes o1
SET used = true
WHERE used = false
  AND EXISTS (
    SELECT 1 FROM otp_codes o2
    WHERE o2.device_modelo_id = o1.device_modelo_id
      AND o2.used = false
      AND o2.created_at > o1.created_at
  );

-- Índice UNIQUE apenas em OTPs não-usados
-- A expiração é verificada na função verify_otp_atomic()
CREATE UNIQUE INDEX IF NOT EXISTS idx_otp_codes_device_unused_unique
ON public.otp_codes(device_modelo_id)
WHERE used = false;

COMMENT ON INDEX idx_otp_codes_device_unused_unique IS
  'Garante 1 OTP não-usado por jornada - evita duplicatas por double-click';


-- ============================================================================
-- 2. FUNÇÃO ATÔMICA PARA VERIFICAR OTP
-- Resolve race condition: SELECT + UPDATE em uma única transação com lock
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_otp_atomic(
  p_journey_id BIGINT,
  p_code_hash TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_otp_record RECORD;
  v_result JSON;
BEGIN
  -- Buscar e bloquear OTP válido (FOR UPDATE previne race condition)
  SELECT id, code_hash, attempts
  INTO v_otp_record
  FROM otp_codes
  WHERE device_modelo_id = p_journey_id
    AND used = false
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  -- OTP não encontrado
  IF v_otp_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Código expirado ou não encontrado'
    );
  END IF;

  -- Muitas tentativas
  IF v_otp_record.attempts >= 3 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'too_many_attempts',
      'message', 'Muitas tentativas. Solicite um novo código.'
    );
  END IF;

  -- Código incorreto
  IF v_otp_record.code_hash != p_code_hash THEN
    -- Incrementar tentativas
    UPDATE otp_codes
    SET attempts = attempts + 1
    WHERE id = v_otp_record.id;

    -- Registrar evento de falha
    INSERT INTO journey_events (device_modelo_id, event_type, step_name, metadata)
    VALUES (p_journey_id, 'otp_failed', 'otp',
            json_build_object('attempts', v_otp_record.attempts + 1));

    RETURN json_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Código inválido',
      'attempts', v_otp_record.attempts + 1
    );
  END IF;

  -- SUCESSO: Código válido - executar todas as atualizações atomicamente

  -- 1. Marcar OTP como usado
  UPDATE otp_codes
  SET used = true
  WHERE id = v_otp_record.id;

  -- 2. Atualizar jornada
  UPDATE device_modelo
  SET
    jornada_step = 'device',
    otp_verified_at = NOW()
  WHERE id = p_journey_id;

  -- 3. Registrar evento de sucesso
  INSERT INTO journey_events (device_modelo_id, event_type, step_name)
  VALUES (p_journey_id, 'otp_verified', 'otp');

  RETURN json_build_object(
    'success', true,
    'message', 'Código verificado com sucesso'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, retorna detalhes
    RETURN json_build_object(
      'success', false,
      'error', 'internal_error',
      'message', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION verify_otp_atomic IS
  'Verifica OTP de forma atômica - previne race condition e garante consistência';


-- ============================================================================
-- 3. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION verify_otp_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION verify_otp_atomic TO anon;
GRANT EXECUTE ON FUNCTION verify_otp_atomic TO service_role;
