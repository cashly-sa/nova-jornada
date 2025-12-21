-- ============================================================================
-- Migration: 008_fix_verify_otp_step.sql
-- Descrição: Corrige a função verify_otp_atomic para usar step numérico '02'
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
    VALUES (p_journey_id, 'otp_failed', '01',
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

  -- 2. Atualizar jornada (usando step numérico '02')
  UPDATE device_modelo
  SET
    jornada_step = '02',
    otp_verified_at = NOW()
  WHERE id = p_journey_id;

  -- 3. Registrar evento de sucesso
  INSERT INTO journey_events (device_modelo_id, event_type, step_name)
  VALUES (p_journey_id, 'otp_verified', '01');

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
  'Verifica OTP de forma atômica - previne race condition e garante consistência. Step atualizado para formato numérico (02).';
