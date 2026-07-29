ALTER TABLE public.solicitacoes_parcelamento
  ADD COLUMN IF NOT EXISTS vale_unificado BOOLEAN NOT NULL DEFAULT FALSE;
