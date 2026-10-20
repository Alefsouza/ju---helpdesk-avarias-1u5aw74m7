-- Adiciona campos de restrição à tabela chamados
ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS em_restricao BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS restricao_motivo TEXT,
  ADD COLUMN IF NOT EXISTS restricao_observacao TEXT,
  ADD COLUMN IF NOT EXISTS restricao_aplicada_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS restricao_aplicada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restricao_removida_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS restricao_removida_em TIMESTAMPTZ;

-- Índice para acelerar consultas filtrando chamados em restrição
CREATE INDEX IF NOT EXISTS idx_chamados_em_restricao ON public.chamados (em_restricao) WHERE em_restricao IS TRUE;
