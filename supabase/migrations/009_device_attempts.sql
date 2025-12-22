-- ============================================================================
-- Migration: 009_device_attempts.sql
-- Descrição: Adiciona campo device_attempts para contar tentativas de validação
-- Data: 2025-12-21
-- ============================================================================

-- Adicionar campo device_attempts para contar tentativas de validação de device
-- Quando device é rejeitado, não muda mais o status para 'rejected'
-- Apenas incrementa o contador e permite nova tentativa
ALTER TABLE public.device_modelo
ADD COLUMN IF NOT EXISTS device_attempts INTEGER DEFAULT 0;

COMMENT ON COLUMN public.device_modelo.device_attempts IS
  'Contador de tentativas de validação de device - permite reutilizar jornada após rejeição';
