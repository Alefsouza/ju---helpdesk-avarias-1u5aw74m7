-- Create atomic RPC for Dr. Claudinei's chamado recusal flow
-- Reopens the chamado (status -> 'aberto' when 'finalizado'), logs history, and
-- notifies the Jurídico team (Maria and Luiz) with the recusal reason.

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
BEGIN
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'Motivo da recusa é obrigatório';
  END IF;

  SELECT status INTO v_current_status
  FROM public.chamados
  WHERE id = p_chamado_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chamado não encontrado';
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

  -- 2. Preserve the history entry (acao = 'reaberto')
  INSERT INTO public.historico_chamado (chamado_id, usuario_id, acao, detalhes)
  VALUES (
    p_chamado_id,
    p_usuario_id,
    'reaberto',
    'Chamado recusado por Claudinei. Motivo: ' || p_motivo
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
