-- Update recusar_chamado_claudinei RPC:
-- - Set status = 'em_atendimento' (instead of 'aberto')
-- - Clear status_interno (NULL) so the chamado returns to the normal Jurídico queue
-- - Reassign responsavel_id to the previous responsible (Luiz or Maria)
-- - Record rejection and reassignment in historico_chamado with acao = 'recusado_claudinei'
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
  v_previous_responsavel UUID;
  v_maria_id UUID;
  v_luiz_id UUID;
  v_responsavel_nome TEXT;
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

  -- Find Maria and Luiz UUIDs
  SELECT id INTO v_maria_id
  FROM public.perfil_usuario
  WHERE email = 'maria.rodrigues@viasudeste.com'
  LIMIT 1;

  SELECT id INTO v_luiz_id
  FROM public.perfil_usuario
  WHERE email = 'luiz.juridico@viasudeste.com'
  LIMIT 1;

  -- Find the previous responsible (Maria or Luiz) from historico_chamado
  SELECT hc.usuario_id, pu.nome_completo
  INTO v_previous_responsavel, v_responsavel_nome
  FROM public.historico_chamado hc
  JOIN public.perfil_usuario pu ON pu.id = hc.usuario_id
  WHERE hc.chamado_id = p_chamado_id
    AND hc.usuario_id IN (
      SELECT id FROM public.perfil_usuario
      WHERE email IN ('maria.rodrigues@viasudeste.com', 'luiz.juridico@viasudeste.com')
        OR tipo_usuario = 'juridico'
    )
  ORDER BY hc.criado_em DESC
  LIMIT 1;

  -- Fallback: if no historico entry found, default to Maria then Luiz
  IF v_previous_responsavel IS NULL THEN
    v_previous_responsavel := COALESCE(v_maria_id, v_luiz_id);
    SELECT nome_completo INTO v_responsavel_nome
    FROM public.perfil_usuario
    WHERE id = v_previous_responsavel
    LIMIT 1;
  END IF;

  -- 1. Update chamado: status -> em_atendimento, clear status_interno, reassign responsavel
  UPDATE public.chamados
  SET status_aprovacao_claudinei = 'recusado',
      status_interno = NULL,
      status = CASE WHEN status = 'finalizado' THEN 'em_atendimento' ELSE status END,
      responsavel_id = v_previous_responsavel,
      atualizado_em = NOW()
  WHERE id = p_chamado_id;

  -- 2. Record rejection and reassignment in historico_chamado
  INSERT INTO public.historico_chamado (chamado_id, usuario_id, acao, detalhes)
  VALUES (
    p_chamado_id,
    p_usuario_id,
    'recusado_claudinei',
    'Chamado recusado por Claudinei. Motivo: ' || p_motivo ||
    '. Chamado reatribuído ao responsável anterior: ' || COALESCE(v_responsavel_nome, 'não identificado') ||
    ' (UUID: ' || COALESCE(v_previous_responsavel::text, 'não encontrado') || ').'
  );

  -- 3. Notify the Jurídico team (Maria and Luiz)
  FOR v_recipient IN
    SELECT id FROM public.perfil_usuario
    WHERE ativo = true
      AND (
        email IN ('maria.rodrigues@viasudeste.com', 'luiz.juridico@viasudeste.com')
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
