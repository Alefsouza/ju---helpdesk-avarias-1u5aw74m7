-- RLS policies to allow the "planejamento" profile to read and act on the
-- same vale/chamado data that Alex Fontes (admin) can access.
-- All statements are idempotent (DROP POLICY IF EXISTS before CREATE POLICY).

-- chamados: SELECT + UPDATE (approve / reject)
DROP POLICY IF EXISTS "planejamento_select_chamados" ON public.chamados;
CREATE POLICY "planejamento_select_chamados" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

DROP POLICY IF EXISTS "planejamento_update_chamados" ON public.chamados;
CREATE POLICY "planejamento_update_chamados" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

-- historico_chamado: SELECT + INSERT (approval / rejection audit)
DROP POLICY IF EXISTS "planejamento_select_historico_chamado" ON public.historico_chamado;
CREATE POLICY "planejamento_select_historico_chamado" ON public.historico_chamado
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

DROP POLICY IF EXISTS "planejamento_insert_historico_chamado" ON public.historico_chamado;
CREATE POLICY "planejamento_insert_historico_chamado" ON public.historico_chamado
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

-- mensagens_internas_chamado: SELECT + INSERT (internal rejection message)
DROP POLICY IF EXISTS "planejamento_select_mensagens_internas" ON public.mensagens_internas_chamado;
CREATE POLICY "planejamento_select_mensagens_internas" ON public.mensagens_internas_chamado
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

DROP POLICY IF EXISTS "planejamento_insert_mensagens_internas" ON public.mensagens_internas_chamado;
CREATE POLICY "planejamento_insert_mensagens_internas" ON public.mensagens_internas_chamado
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

-- notificacoes: SELECT + INSERT + UPDATE (notify responsible on rejection)
DROP POLICY IF EXISTS "planejamento_select_notificacoes" ON public.notificacoes;
CREATE POLICY "planejamento_select_notificacoes" ON public.notificacoes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

DROP POLICY IF EXISTS "planejamento_insert_notificacoes" ON public.notificacoes;
CREATE POLICY "planejamento_insert_notificacoes" ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

DROP POLICY IF EXISTS "planejamento_update_notificacoes" ON public.notificacoes;
CREATE POLICY "planejamento_update_notificacoes" ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

-- anexos_chamado_interno: SELECT (attachments shown in approval list)
DROP POLICY IF EXISTS "planejamento_select_anexos_internos" ON public.anexos_chamado_interno;
CREATE POLICY "planejamento_select_anexos_internos" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

-- documentos: SELECT (orçamentos and related docs)
DROP POLICY IF EXISTS "planejamento_select_documentos" ON public.documentos;
CREATE POLICY "planejamento_select_documentos" ON public.documentos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

-- parcelas_vales: SELECT (vale installments)
DROP POLICY IF EXISTS "planejamento_select_parcelas_vales" ON public.parcelas_vales;
CREATE POLICY "planejamento_select_parcelas_vales" ON public.parcelas_vales
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

-- solicitacoes_parcelamento: SELECT (parcelment requests)
DROP POLICY IF EXISTS "planejamento_select_solicitacoes_parcelamento" ON public.solicitacoes_parcelamento;
CREATE POLICY "planejamento_select_solicitacoes_parcelamento" ON public.solicitacoes_parcelamento
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

-- formularios_espelho_danos: SELECT (driver / occurrence data)
DROP POLICY IF EXISTS "planejamento_select_formularios_espelho_danos" ON public.formularios_espelho_danos;
CREATE POLICY "planejamento_select_formularios_espelho_danos" ON public.formularios_espelho_danos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );
