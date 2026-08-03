-- Idempotent migration to remove incorrectly linked "Nota fiscal 26156 ADAPTA.pdf" files
-- from chamado aaa01cd4-8f26-4932-bf82-5fde171601e8.
--
-- Scope:
--   - Deletes records from anexos_chamado, anexos_chamado_interno and documentos
--     matching the filename '%Nota fiscal 26156 ADAPTA%' for the target chamado.
--   - Registers a manual removal entry in historico_chamado (guarded to avoid duplicates).
--
-- Known limitation: Physical files in Supabase Storage buckets
-- (`chamados` and `anexos_chamados_interno`) are NOT removed automatically by this
-- migration. They must be removed manually if needed.

DO $$
DECLARE
  v_chamado_id uuid := 'aaa01cd4-8f26-4932-bf82-5fde171601e8'::uuid;
  v_admin_id uuid;
  v_detalhe text := 'Remoção manual dos arquivos da Nota fiscal 26156 ADAPTA';
BEGIN
  -- ------------------------------------------------------------------
  -- 1. Extend historico_chamado.acao constraint to allow 'remocao_manual_arquivos'
  -- ------------------------------------------------------------------
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
      'remocao_manual_arquivos'::text,
      'Justificativa: Não Houve Orçamento'::text
    ]));

  -- ------------------------------------------------------------------
  -- 2. Delete from anexos_chamado (url_arquivo / nome_arquivo)
  -- ------------------------------------------------------------------
  DELETE FROM public.anexos_chamado
  WHERE chamado_id = v_chamado_id
    AND (
      COALESCE(nome_arquivo, '') ILIKE '%Nota fiscal 26156 ADAPTA%'
      OR COALESCE(url_arquivo, '') ILIKE '%Nota fiscal 26156 ADAPTA%'
    );

  -- ------------------------------------------------------------------
  -- 3. Delete from anexos_chamado_interno (arquivo_url / nome_arquivo)
  -- ------------------------------------------------------------------
  DELETE FROM public.anexos_chamado_interno
  WHERE chamado_id = v_chamado_id
    AND (
      COALESCE(nome_arquivo, '') ILIKE '%Nota fiscal 26156 ADAPTA%'
      OR COALESCE(arquivo_url, '') ILIKE '%Nota fiscal 26156 ADAPTA%'
    );

  -- ------------------------------------------------------------------
  -- 4. Delete from documentos (nome_arquivo / arquivo_url)
  --    Target types: Documento do Veículo, CNH, Orçamento 1, Orçamento 2,
  --    Boletim de Ocorrência
  -- ------------------------------------------------------------------
  DELETE FROM public.documentos
  WHERE chamado_id = v_chamado_id
    AND COALESCE(nome_arquivo, '') ILIKE '%Nota fiscal 26156 ADAPTA%'
    AND COALESCE(tipo_documento, '') IN (
      'Documento do Veículo',
      'CNH',
      'Orçamento 1',
      'Orçamento 2',
      'Boletim de Ocorrência'
    );

  -- ------------------------------------------------------------------
  -- 5. Register manual removal in historico_chamado (idempotent guard)
  -- ------------------------------------------------------------------
  -- Pick an admin user for the audit field (fallback to responsavel if none)
  SELECT id INTO v_admin_id
  FROM public.perfil_usuario
  WHERE tipo_usuario = 'admin' AND ativo = true
  ORDER BY criado_em ASC
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id
    FROM public.perfil_usuario
    WHERE tipo_usuario = 'responsavel' AND ativo = true
    ORDER BY criado_em ASC
    LIMIT 1;
  END IF;

  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id
    FROM public.perfil_usuario
    WHERE ativo = true
    ORDER BY criado_em ASC
    LIMIT 1;
  END IF;

  -- Only insert if not already registered (idempotency guard)
  IF NOT EXISTS (
    SELECT 1
    FROM public.historico_chamado
    WHERE chamado_id = v_chamado_id
      AND acao = 'remocao_manual_arquivos'
      AND detalhes = v_detalhe
  ) THEN
    INSERT INTO public.historico_chamado (chamado_id, usuario_id, acao, detalhes)
    VALUES (v_chamado_id, v_admin_id, 'remocao_manual_arquivos', v_detalhe);
  END IF;
END $$;
