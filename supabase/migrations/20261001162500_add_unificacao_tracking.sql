-- Adiciona colunas para rastrear com precisão a unificação e permitir desunificação perfeita
ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS unificado_em_chamado_id uuid REFERENCES public.chamados(id) ON DELETE SET NULL;

ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS descricao_original text;

ALTER TABLE public.anexos_chamado
  ADD COLUMN IF NOT EXISTS chamado_origem_id uuid REFERENCES public.chamados(id) ON DELETE SET NULL;

ALTER TABLE public.anexos_chamado_interno
  ADD COLUMN IF NOT EXISTS chamado_origem_id uuid REFERENCES public.chamados(id) ON DELETE SET NULL;

ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS chamado_origem_id uuid REFERENCES public.chamados(id) ON DELETE SET NULL;

ALTER TABLE public.formularios_espelho_danos
  ADD COLUMN IF NOT EXISTS chamado_origem_id uuid REFERENCES public.chamados(id) ON DELETE SET NULL;

ALTER TABLE public.formularios_ido
  ADD COLUMN IF NOT EXISTS chamado_origem_id uuid REFERENCES public.chamados(id) ON DELETE SET NULL;

ALTER TABLE public.historico_chamado
  ADD COLUMN IF NOT EXISTS chamado_origem_id uuid REFERENCES public.chamados(id) ON DELETE SET NULL;

ALTER TABLE public.respostas_chamado
  ADD COLUMN IF NOT EXISTS chamado_origem_id uuid REFERENCES public.chamados(id) ON DELETE SET NULL;

-- Índices para performance nas consultas de unificação / desunificação
CREATE INDEX IF NOT EXISTS idx_chamados_unificado_em ON public.chamados(unificado_em_chamado_id);
CREATE INDEX IF NOT EXISTS idx_anexos_chamado_origem ON public.anexos_chamado(chamado_origem_id);
CREATE INDEX IF NOT EXISTS idx_anexos_interno_origem ON public.anexos_chamado_interno(chamado_origem_id);
CREATE INDEX IF NOT EXISTS idx_documentos_origem ON public.documentos(chamado_origem_id);
CREATE INDEX IF NOT EXISTS idx_formularios_espelho_origem ON public.formularios_espelho_danos(chamado_origem_id);
CREATE INDEX IF NOT EXISTS idx_formularios_ido_origem ON public.formularios_ido(chamado_origem_id);
CREATE INDEX IF NOT EXISTS idx_historico_chamado_origem ON public.historico_chamado(chamado_origem_id);
CREATE INDEX IF NOT EXISTS idx_respostas_chamado_origem ON public.respostas_chamado(chamado_origem_id);

-- Backfill unificado_em_chamado_id para chamados unificados que possuem a tag [SISTEMA]: Este chamado foi unificado com o chamado destino #...
DO $$
DECLARE
  rec RECORD;
  destino_uuid uuid;
  match_text text;
BEGIN
  FOR rec IN
    SELECT id, descricao
    FROM public.chamados
    WHERE status = 'unificado'
      AND unificado_em_chamado_id IS NULL
      AND descricao ~* '\[SISTEMA\]: Este chamado foi unificado com o chamado destino #([0-9a-fA-F\-]{36})'
  LOOP
    match_text := substring(rec.descricao FROM '\[SISTEMA\]: Este chamado foi unificado com o chamado destino #([0-9a-fA-F\-]{36})');
    IF match_text IS NOT NULL THEN
      BEGIN
        destino_uuid := match_text::uuid;
        UPDATE public.chamados
        SET unificado_em_chamado_id = destino_uuid
        WHERE id = rec.id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;
END $$;
