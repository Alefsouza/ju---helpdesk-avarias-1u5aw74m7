-- Grant planejamento profile SELECT and INSERT on mensagens_internas_chamado
-- so they can view and send internal chat messages.
-- No UPDATE or DELETE permissions are granted.
-- Idempotent: DROP POLICY IF EXISTS before CREATE POLICY.

-- mensagens_internas_chamado: SELECT
DROP POLICY IF EXISTS "planejamento_select_mensagens_internas" ON public.mensagens_internas_chamado;
CREATE POLICY "planejamento_select_mensagens_internas" ON public.mensagens_internas_chamado
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

-- mensagens_internas_chamado: INSERT
DROP POLICY IF EXISTS "planejamento_insert_mensagens_internas" ON public.mensagens_internas_chamado;
CREATE POLICY "planejamento_insert_mensagens_internas" ON public.mensagens_internas_chamado
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );

-- anexos_chamado_interno: SELECT (already exists in prior migration, re-asserted here for completeness)
DROP POLICY IF EXISTS "planejamento_select_anexos_internos" ON public.anexos_chamado_interno;
CREATE POLICY "planejamento_select_anexos_internos" ON public.anexos_chamado_interno
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_usuario
      WHERE id = auth.uid() AND tipo_usuario = 'planejamento'
    )
  );
