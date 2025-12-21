-- ============================================================================
-- Migration: 006_heartbeat.sql
-- Descrição: Adiciona coluna para tracking de heartbeat (presença ativa)
-- Data: 2025-12-20
-- ============================================================================

ALTER TABLE device_modelo
ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz;

-- Índice para queries de usuários ativos
CREATE INDEX IF NOT EXISTS idx_device_modelo_heartbeat
ON device_modelo(last_heartbeat_at)
WHERE status = 'in_progress';

COMMENT ON COLUMN device_modelo.last_heartbeat_at IS
  'Último heartbeat recebido - usado para calcular usuários ativos em tempo real';
