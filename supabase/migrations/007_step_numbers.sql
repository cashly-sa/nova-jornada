-- ============================================================================
-- Migration: 007_step_numbers.sql
-- Descrição: Padroniza nomenclatura de steps para números (01, 02, 03, etc.)
-- ============================================================================

-- Atualizar steps existentes para nova nomenclatura
UPDATE device_modelo SET jornada_step = '01' WHERE jornada_step = 'otp';
UPDATE device_modelo SET jornada_step = '02' WHERE jornada_step = 'device';
UPDATE device_modelo SET jornada_step = '03' WHERE jornada_step = 'renda';
UPDATE device_modelo SET jornada_step = '04' WHERE jornada_step = 'oferta';
UPDATE device_modelo SET jornada_step = '05' WHERE jornada_step = 'knox';
UPDATE device_modelo SET jornada_step = '06' WHERE jornada_step = 'contrato';
UPDATE device_modelo SET jornada_step = '07' WHERE jornada_step = 'sucesso';

-- Adicionar comentário para documentação
COMMENT ON COLUMN device_modelo.jornada_step IS
  'Step atual da jornada: 01=OTP, 02=Device, 03=Renda, 04=Oferta, 05=Knox, 06=Contrato, 07=Sucesso';
