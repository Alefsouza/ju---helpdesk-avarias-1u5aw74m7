-- Fix runtime error in recusar_chamado_claudinei: use acao value allowed by constraint
-- Add 'recusado' to the allowed acao values and update the RPC to use it

-- 1. Add 'recusado' to the historico_chamado_acao_check constraint
ALTER TABLE public.historico_chamado DROP CONSTRAINT IF EXISTS historico_chamado_acao_check;

ALTER TABLE public.historico_chamado ADD CONSTRAINT historico_chamado_acao_check
  CHECK (acao = ANY (ARRAY[
    'criado'::text,
    'atribuido'::text,
    'respondido'::text,
    'finalizado'::text,
    'deletado'::text,
    'transferido'::text,
    'reaberto'::text,
    'pendente'::text,
    'recusado'::text,
    'Justificativa: Não Houve Orçamento'::text
  ]));

-- 2. Replace the RPC function with corrected acao value and enriched detalhes
CREATE OR REPLACE FUNCTION public.recusar_chamado_claudinei(
  p_chamado_id UUID,
  p_usuario_id UUID,
  p_motivo TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_short_id TEXT;
  v_recipient UUID;
  v_current_status TEXT;
  v_link TEXT;
  v_responsavel_id UUID;
  v_responsavel_nome TEXT;
BEGIN
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'Motivo da recusa é obrigatório';
  END IF;

  SELECT status, responsavel_id INTO v_current_status, v_responsavel_id
  FROM public.chamados
  WHERE id = p_chamado_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chamado não encontrado';
  END IF;

  -- Lookup responsavel name if assigned
  IF v_responsavel_id IS NOT NULL THEN
    SELECT nome_completo INTO v_responsavel_nome
    FROM public.perfil_usuario
    WHERE id = v_responsavel_id;
  END IF;

  v_short_id := UPPER(SPLIT_PART(p_chamado_id::text, '-', 1));
  v_link := '/dashboard/chamados/' || p_chamado_id::text;

  -- 1. Reopen the chamado only if it was finalized; mark recusal status
  UPDATE public.chamados
  SET status_aprovacao_claudinei = 'recusado',
      status_interno = 'recusado_claudinei',
      status = CASE WHEN status = 'finalizado' THEN 'aberto' ELSE status END,
      atualizado_em = NOW()
  WHERE id = p_chamado_id;

  -- 2. Insert history with allowed acao value ('recusado')
  INSERT INTO public.historico_chamado (chamado_id, usuario_id, acao, detalhes)
  VALUES (
    p_chamado_id,
    p_usuario_id,
    'recusado',
    'Chamado recusado por Claudinei. Motivo: ' || p_motivo ||
    CASE
      WHEN v_responsavel_nome IS NOT NULL THEN
        '. Chamado reatribuído para ' || v_responsavel_nome || '.'
      ELSE
        '.'
    END
  );

  -- 3. Notify the Jurídico team (Maria and Luiz) — by email, tipo_usuario or departamento
  FOR v_recipient IN
    SELECT id FROM public.perfil_usuario
    WHERE ativo = true
      AND (
        email IN (
          'maria.rodrigues@viasudeste.com',
          'luiz.juridico@viasudeste.com'
        )
        OR tipo_usuario = 'juridico'
        OR COALESCE(departamento, '') ILIKE '%juridico%'
      )
  LOOP
    INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link, lida, criado_em)
    VALUES (
      v_recipient,
      'Recusa do Dr. Claudinei #' || v_short_id,
      p_motivo,
      v_link,
      false,
      NOW()
    );
  END LOOP;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.recusar_chamado_claudinei(UUID, UUID, TEXT) TO authenticated;
