-- Allow Contábil and Financeiro users to UPDATE chamados (status_interno, etc.)
-- Additive policy: does not modify existing UPDATE policies.
DROP POLICY IF EXISTS "chamados_update_contabil_financeiro" ON public.chamados;
CREATE POLICY "chamados_update_contabil_financeiro" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) IN ('contabil', 'financeiro')
  )
  WITH CHECK (
    (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) IN ('contabil', 'financeiro')
  );

-- Allow Contábil and Financeiro users to INSERT log entries into historico_chamado
DROP POLICY IF EXISTS "historico_chamado_insert_contabil_financeiro" ON public.historico_chamado;
CREATE POLICY "historico_chamado_insert_contabil_financeiro" ON public.historico_chamado
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT tipo_usuario FROM public.perfil_usuario WHERE id = auth.uid()) IN ('contabil', 'financeiro')
  );
