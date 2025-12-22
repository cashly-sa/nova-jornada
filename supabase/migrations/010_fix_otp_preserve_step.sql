-- ============================================================================
-- Migration: 010_fix_otp_preserve_step.sql
-- Descrição: Corrige verify_otp_atomic para NÃO alterar jornada_step
--            Preserva o progresso do usuário quando OTP expira e re-valida
-- Data: 2025-12-22
-- ============================================================================

-- Problema anterior:
-- Quando o OTP expirava e o usuário re-validava, a função SEMPRE resetava
-- jornada_step para '02', perdendo todo o progresso (ex: usuário estava no step 04,
-- após re-validar OTP ia para step 02)
--
-- Solução:
-- A função agora APENAS atualiza otp_verified_at, preservando jornada_step

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

  -- 2. Atualizar jornada - APENAS otp_verified_at, NÃO ALTERA jornada_step
  -- Isso preserva o progresso do usuário quando OTP expira e re-valida
  UPDATE device_modelo
  SET otp_verified_at = NOW()
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
  'Verifica OTP de forma atômica. NÃO altera jornada_step - preserva progresso quando OTP expira.';
