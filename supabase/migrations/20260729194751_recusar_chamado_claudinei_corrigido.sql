-- Corrected recusar_chamado_claudinei RPC:
-- - Sets status to 'em_atendimento' (instead of 'aberto')
-- - Reassigns responsavel_id to the previous responsible (from history, then participantes, then Jurídico fallback)
-- - Logs history with acao = 'recusou_chamado'

-- 1. Extend the acao constraint to allow 'recusou_chamado'
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
    'recusou_chamado'::text,
    'Justificativa: Não Houve Orçamento'::text
  ]));

-- 2. Replace the RPC function
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
  v_previous_responsavel_id UUID;
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

  -- 1. Find previous responsible from historico_chamado (responsibility-change actions, excluding the recuser)
  SELECT h.usuario_id INTO v_previous_responsavel_id
  FROM public.historico_chamado h
  WHERE h.chamado_id = p_chamado_id
    AND h.acao IN ('assumiu_responsabilidade', 'atribuido', 'transferido')
    AND h.usuario_id IS DISTINCT FROM p_usuario_id
  ORDER BY h.criado_em DESC
  LIMIT 1;

  -- 2. Fallback: participantes_chamado with tipo_usuario = 'responsavel'
  IF v_previous_responsavel_id IS NULL THEN
    SELECT pc.usuario_id INTO v_previous_responsavel_id
    FROM public.participantes_chamado pc
    INNER JOIN public.perfil_usuario pu ON pu.id = pc.usuario_id
    WHERE pc.chamado_id = p_chamado_id
      AND pu.tipo_usuario = 'responsavel'
      AND pu.ativo = true
    ORDER BY pc.criado_em ASC
    LIMIT 1;
  END IF;

  -- 3. Fallback: Jurídico responsibles (Maria first, then Luiz, then any Jurídico dept user)
  IF v_previous_responsavel_id IS NULL THEN
    SELECT id INTO v_previous_responsavel_id
    FROM public.perfil_usuario
    WHERE ativo = true
      AND (
        email IN ('maria.rodrigues@viasudeste.com', 'luiz.juridico@viasudeste.com')
        OR (COALESCE(departamento, '') ILIKE '%juridico%' AND tipo_usuario IN ('responsavel', 'admin', 'juridico'))
      )
    ORDER BY
      CASE WHEN email = 'maria.rodrigues@viasudeste.com' THEN 1
           WHEN email = 'luiz.juridico@viasudeste.com' THEN 2
           ELSE 3 END
    LIMIT 1;
  END IF;

  -- Lookup the responsible name for the history details
  IF v_previous_responsavel_id IS NOT NULL THEN
    SELECT nome_completo INTO v_responsavel_nome
    FROM public.perfil_usuario
    WHERE id = v_previous_responsavel_id;
  END IF;

  v_short_id := UPPER(SPLIT_PART(p_chamado_id::text, '-', 1));
  v_link := '/dashboard/chamados/' || p_chamado_id::text;

  -- Update the chamado: status = em_atendimento, reassign to previous responsible
  UPDATE public.chamados
  SET status_aprovacao_claudinei = 'recusado',
      status_interno = 'recusado_claudinei',
      status = 'em_atendimento',
      responsavel_id = COALESCE(v_previous_responsavel_id, responsavel_id),
      atualizado_em = NOW()
  WHERE id = p_chamado_id;

  -- Insert history with acao = 'recusou_chamado'
  INSERT INTO public.historico_chamado (chamado_id, usuario_id, acao, detalhes)
  VALUES (
    p_chamado_id,
    p_usuario_id,
    'recusou_chamado',
    'Chamado recusado por Claudinei. Motivo: ' || p_motivo ||
    '. Reatribuído para responsável anterior com status em_atendimento.' ||
    CASE
      WHEN v_responsavel_nome IS NOT NULL THEN ' Responsável: ' || v_responsavel_nome || '.'
      ELSE ''
    END
  );

  -- Notify the Jurídico team (Maria and Luiz) about the recusal
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
